import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

/**
 * MongoDB Introspection Script
 * ----------------------------
 * Inspects an existing MongoDB database and prints:
 * - collection list
 * - document counts
 * - sample documents
 * - inferred field types (from sampled docs)
 * - required/optional likelihood (based on sample presence)
 *
 * Usage:
 *   node src/scripts/introspectMongo.js
 *
 * Optional env:
 *   MONGODB_URI or MONGO_URI   (required)
 *   MONGO_DB_NAME              (optional, can be auto-detected from URI)
 *   INTROSPECT_SAMPLE_SIZE     (optional, default: 50)
 *   INTROSPECT_SAMPLE_DOCS     (optional, default: 3)
 */

const SAMPLE_SIZE = Number(process.env.INTROSPECT_SAMPLE_SIZE || 50);
const SAMPLE_DOCS_TO_PRINT = Number(process.env.INTROSPECT_SAMPLE_DOCS || 3);

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || "";

if (!MONGO_URI) {
  console.error("❌ Missing MONGODB_URI (or MONGO_URI) in environment.");
  process.exit(1);
}

const normalizeType = (value) => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (value instanceof Date) return "date";
  if (value?._bsontype === "ObjectId") return "objectId";
  if (value?._bsontype === "Decimal128") return "decimal128";
  if (value?._bsontype === "Long") return "long";
  if (value && typeof value === "object" && value._bsontype === "Binary") return "binary";
  return typeof value;
};

const isPlainObject = (v) =>
  v !== null &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  !(v instanceof Date) &&
  !v._bsontype;

/**
 * Flatten object keys for nested field inference.
 * Example: { profile: { name: "A" } } -> profile.name
 */
const flattenDocument = (doc, prefix = "", out = {}) => {
  if (!isPlainObject(doc)) return out;

  for (const [key, value] of Object.entries(doc)) {
    const path = prefix ? `${prefix}.${key}` : key;

    out[path] = value;

    if (isPlainObject(value)) {
      flattenDocument(value, path, out);
    }
  }

  return out;
};

const inferFieldStats = (docs) => {
  const stats = new Map();
  const total = docs.length || 1;

  for (const doc of docs) {
    const flat = flattenDocument(doc);

    for (const [path, value] of Object.entries(flat)) {
      if (!stats.has(path)) {
        stats.set(path, {
          presence: 0,
          types: new Map(),
          samples: [],
        });
      }

      const entry = stats.get(path);
      entry.presence += 1;

      const type = normalizeType(value);
      entry.types.set(type, (entry.types.get(type) || 0) + 1);

      if (entry.samples.length < 3) {
        entry.samples.push(value);
      }

      // For arrays, infer element types (lightweight)
      if (Array.isArray(value)) {
        const elementTypes = new Set(value.slice(0, 10).map(normalizeType));
        for (const et of elementTypes) {
          const arrayType = `array<${et}>`;
          entry.types.set(arrayType, (entry.types.get(arrayType) || 0) + 1);
        }
      }
    }
  }

  const result = [...stats.entries()]
    .map(([field, data]) => {
      const types = [...data.types.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([t]) => t);

      const requiredRatio = data.presence / total;
      let requiredHint = "optional";
      if (requiredRatio >= 0.95) requiredHint = "likely_required";
      else if (requiredRatio >= 0.7) requiredHint = "often_present";

      return {
        field,
        presence: `${data.presence}/${total}`,
        presenceRatio: Number(requiredRatio.toFixed(2)),
        requiredHint,
        types,
        sampleValues: data.samples,
      };
    })
    .sort((a, b) => a.field.localeCompare(b.field));

  return result;
};

const safeJson = (value) =>
  JSON.stringify(
    value,
    (key, val) => {
      if (val instanceof Date) return val.toISOString();
      if (val && val._bsontype === "ObjectId") return val.toString();
      if (val && val._bsontype === "Decimal128") return val.toString();
      if (val && val._bsontype === "Long") return val.toString();
      if (typeof val === "bigint") return val.toString();
      return val;
    },
    2
  );

const printDivider = () => {
  console.log("=".repeat(110));
};

const run = async () => {
  try {
    await mongoose.connect(MONGO_URI, MONGO_DB_NAME ? { dbName: MONGO_DB_NAME } : {});
    const db = mongoose.connection.db;

    if (!db) {
      throw new Error("Database connection is not initialized.");
    }

    const effectiveDbName = db.databaseName;
    console.log(`✅ Connected to MongoDB`);
    console.log(`📦 Database: ${effectiveDbName}`);
    console.log(`🔍 Sample size per collection: ${SAMPLE_SIZE}`);
    console.log(`🧪 Sample docs printed per collection: ${SAMPLE_DOCS_TO_PRINT}`);
    printDivider();

    const collections = await db.listCollections({}, { nameOnly: true }).toArray();

    if (!collections.length) {
      console.log("⚠️ No collections found.");
      return;
    }

    console.log(`📚 Collections found (${collections.length}):`);
    for (const c of collections) {
      console.log(` - ${c.name}`);
    }

    printDivider();

    const fullReport = {
      database: effectiveDbName,
      generatedAt: new Date().toISOString(),
      collectionCount: collections.length,
      collections: [],
    };

    for (const c of collections) {
      const collection = db.collection(c.name);

      const count = await collection.estimatedDocumentCount();
      const samples = await collection.find({}).limit(SAMPLE_SIZE).toArray();
      const displaySamples = samples.slice(0, SAMPLE_DOCS_TO_PRINT);

      const fieldStats = inferFieldStats(samples);

      const reportEntry = {
        name: c.name,
        documentCountEstimate: count,
        sampledDocuments: samples.length,
        inferredFields: fieldStats,
      };

      fullReport.collections.push(reportEntry);

      console.log(`📁 Collection: ${c.name}`);
      console.log(`   Estimated documents: ${count}`);
      console.log(`   Sampled docs: ${samples.length}`);

      if (!samples.length) {
        console.log("   (No sample documents to infer schema)");
        printDivider();
        continue;
      }

      console.log("\n   Inferred fields:");
      for (const f of fieldStats) {
        console.log(
          `   - ${f.field} | types: [${f.types.join(", ")}] | presence: ${f.presence} | ${f.requiredHint}`
        );
      }

      console.log("\n   Sample documents:");
      displaySamples.forEach((doc, idx) => {
        console.log(`   [Sample ${idx + 1}]`);
        console.log(
          safeJson(
            doc,
          )
            .split("\n")
            .map((line) => `   ${line}`)
            .join("\n")
        );
      });

      printDivider();
    }

    // Optional machine-readable output file
    const fs = await import("fs/promises");
    const path = await import("path");
    const outputPath = path.resolve(process.cwd(), "mongo-introspection-report.json");
    await fs.writeFile(outputPath, safeJson(fullReport), "utf-8");

    console.log(`📝 Full JSON report saved: ${outputPath}`);
    console.log("✅ Introspection complete.");
  } catch (error) {
    console.error("❌ Introspection failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => null);
  }
};

run();
