const express = require("express");
const responseTime = require("response-time");
const client = require("prom-client"); // Import the prom-client module
const { doSomeHeavyTask } = require("./utils");

const app = express();

const PORT = process.env.PORT || 8000;

// prom-client confiqure
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

app.get("/metrics", async (req, res) => {
  res.setHeader("Content-Type", client.register.contentType);
  const metrics = await client.register.metrics();
  res.send(metrics);
});

// custom metrics
const reqResTime = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method","route", "status_code"],
  buckets: [0.1, 0.2, 0.5, 1, 3, 5, 10, 100, 200, 300, 400, 500,1000,2000],
});


const totalReqCounter = new client.Counter({
    name: "total_requests",
    help: "Total number of requests made",
    labelNames: ["method", "route", "status_code"],
});
    

app.use(
    responseTime((req, res, time) => {
        totalReqCounter.inc();
      reqResTime.labels({
        method: req.method,
        route: req.url,
        status_code: res.statusCode,
      
    }).observe(time / 1000);
  })
);

// random routes

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.get("/operation", async (req, res) => {
  try {
    const timeTaken = await doSomeHeavyTask();
    return res.json({
      status: "success",
      message: `Heavy task completed in ${timeTaken}`,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
