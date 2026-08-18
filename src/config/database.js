import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.COGNO_URI || 'bolt+s://db-d7664b8d.databases.cognodb.com';
const user = process.env.COGNO_USER || 'cognodb';
const password = process.env.COGNO_PASSWORD || '';

let driverInstance = null;

/**
 * Get or initialize the Neo4j / CognoDB driver instance
 */
export function getDriver() {
  if (!driverInstance) {
    if (!uri || !password) {
      console.warn('⚠️ Warning: CognoDB connection details are not fully configured in environment variables.');
    }
    
    driverInstance = neo4j.driver(
      uri,
      neo4j.auth.basic(user, password),
      {
        maxConnectionLifetime: 60 * 1000, // 1 minute
        maxConnectionPoolSize: 25,
        connectionAcquisitionTimeout: 10000,
        connectionTimeout: 10000,
        logging: {
          level: 'warn',
          logger: (level, message) => console.log(`[neo4j-driver:${level}] ${message}`)
        }
      }
    );
  }
  return driverInstance;
}

/**
 * Test connectivity to CognoDB
 */
export async function testConnection() {
  const startTime = Date.now();
  try {
    const driver = getDriver();
    await driver.verifyConnectivity();
    const latency = Date.now() - startTime;
    return {
      connected: true,
      uri: uri.replace(/:\/\/([^@]+@)?/, '://***@'),
      user,
      latencyMs: latency
    };
  } catch (error) {
    // If closed or sleeping, close old driver so next attempt starts fresh
    await closeDriver().catch(() => {});
    return {
      connected: false,
      uri: uri.replace(/:\/\/([^@]+@)?/, '://***@'),
      error: error.message || 'CognoDB Cloud instance is unreachable or sleeping.'
    };
  }
}

/**
 * Helper to recursively convert neo4j Integer objects to standard JS numbers/strings
 */
export function cleanNeo4jData(val) {
  if (val === null || val === undefined) return val;
  
  if (neo4j.isInt(val)) {
    return val.inSafeRange() ? val.toNumber() : val.toString();
  }
  
  if (Array.isArray(val)) {
    return val.map(cleanNeo4jData);
  }
  
  if (typeof val === 'object') {
    if (val.identity && val.labels && val.properties) {
      return {
        id: cleanNeo4jData(val.identity),
        labels: val.labels,
        properties: cleanNeo4jData(val.properties)
      };
    }
    if (val.identity && val.type && val.properties) {
      return {
        id: cleanNeo4jData(val.identity),
        type: val.type,
        startNodeId: cleanNeo4jData(val.start),
        endNodeId: cleanNeo4jData(val.end),
        properties: cleanNeo4jData(val.properties)
      };
    }
    if (val.start && val.end && val.segments) {
      return {
        start: cleanNeo4jData(val.start),
        end: cleanNeo4jData(val.end),
        segments: cleanNeo4jData(val.segments),
        length: cleanNeo4jData(val.length)
      };
    }
    
    const cleaned = {};
    for (const [k, v] of Object.entries(val)) {
      cleaned[k] = cleanNeo4jData(v);
    }
    return cleaned;
  }
  
  return val;
}

/**
 * Execute a parameterized Cypher query with automatic session lifecycle, latency metrics, and reconnect retry
 */
export async function executeQuery(cypher, params = {}, mode = 'READ', isRetry = false) {
  const driver = getDriver();
  const session = driver.session({
    defaultAccessMode: mode === 'WRITE' ? neo4j.session.WRITE : neo4j.session.READ
  });
  
  const startTime = Date.now();
  try {
    const result = await session.run(cypher, params);
    const executionTimeMs = Date.now() - startTime;
    
    const records = result.records.map(record => {
      const obj = {};
      record.keys.forEach(key => {
        obj[key] = cleanNeo4jData(record.get(key));
      });
      return obj;
    });
    
    return {
      records,
      summary: {
        executionTimeMs,
        resultAvailableAfter: result.summary.resultAvailableAfter?.toNumber?.() || 0,
        resultConsumedAfter: result.summary.resultConsumedAfter?.toNumber?.() || 0,
        query: cypher,
        params
      }
    };
  } catch (err) {
    if (!isRetry) {
      console.warn(`⚠️ CognoDB query attempt failed (${err.message}). Retrying with fresh session...`);
      await closeDriver().catch(() => {});
      return await executeQuery(cypher, params, mode, true);
    }
    throw err;
  } finally {
    await session.close().catch(() => {});
  }
}

/**
 * Graceful shutdown for driver
 */
export async function closeDriver() {
  if (driverInstance) {
    const old = driverInstance;
    driverInstance = null;
    await old.close().catch(() => {});
  }
}
