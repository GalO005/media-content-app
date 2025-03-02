#!/usr/bin/env node

/**
 * Script to wait for services to be ready before running tests
 * Used to ensure external Elasticsearch is available
 */

const http = require("http");
const { exec } = require("child_process");

// Configuration
const MAX_RETRIES = 30;
const RETRY_INTERVAL = 1000; // 1 second
// Use the environment variable for the external Elasticsearch URL
const ELASTICSEARCH_URL =
  process.env.ELASTICSEARCH_URL || "http://localhost:9200";

console.log(`Using Elasticsearch at: ${ELASTICSEARCH_URL}`);

// Function to check if Elasticsearch is ready
async function checkElasticsearchHealth() {
  return new Promise((resolve) => {
    const url = new URL("/_cluster/health", ELASTICSEARCH_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: "GET",
      protocol: url.protocol,
    };

    const req = http.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        if (res.statusCode === 200) {
          try {
            const health = JSON.parse(data);
            if (health.status === "green" || health.status === "yellow") {
              console.log("✅ Elasticsearch is ready");
              resolve(true);
            } else {
              console.log(`⏳ Elasticsearch status: ${health.status}`);
              resolve(false);
            }
          } catch (e) {
            console.log("❌ Error parsing Elasticsearch health response");
            resolve(false);
          }
        } else {
          console.log(
            `❌ Elasticsearch health check failed with status: ${res.statusCode}`
          );
          resolve(false);
        }
      });
    });

    req.on("error", (error) => {
      console.log(`❌ Error connecting to Elasticsearch: ${error.message}`);
      resolve(false);
    });

    req.end();
  });
}

// Function to wait for services to be ready
async function waitForServices() {
  console.log("Checking if external services are ready...");

  let retries = 0;
  let allReady = false;

  while (retries < MAX_RETRIES && !allReady) {
    console.log(`Attempt ${retries + 1}/${MAX_RETRIES}`);

    // Check Elasticsearch
    const esReady = await checkElasticsearchHealth();

    // Add more service checks here if needed

    allReady = esReady;

    if (!allReady) {
      retries++;
      if (retries < MAX_RETRIES) {
        console.log(`Retrying in ${RETRY_INTERVAL / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
      }
    }
  }

  if (allReady) {
    console.log("All services are ready! Running tests...");
    // Run the tests with the USE_REAL_SERVICES flag
    exec(
      "USE_REAL_SERVICES=true NODE_ENV=test npm test",
      (error, stdout, stderr) => {
        console.log(stdout);
        if (stderr) console.error(stderr);
        if (error) {
          console.error(`Test execution error: ${error}`);
          process.exit(1);
        }
        process.exit(0);
      }
    );
  } else {
    console.error("Services not ready after maximum retries. Aborting.");
    process.exit(1);
  }
}

// Start the wait process
waitForServices();
