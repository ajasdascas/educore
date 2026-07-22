"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const {
  ensureHostingerSubdomain,
  rootMatchesDirectory,
  validateSlug,
} = require("./provision-school-domain");

async function withServer(handler, run) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function config(apiBaseURL) {
  return {
    apiBaseURL,
    token: "test-token",
    username: "u550473909",
    domain: "onlineu.mx",
    directory: "educore",
  };
}

test("creates a missing Hostinger subdomain with the shared EduCore directory", async () => {
  let requestCount = 0;
  await withServer((request, response) => {
    requestCount += 1;
    assert.equal(request.headers.authorization, "Bearer test-token");
    if (request.method === "GET") {
      response.setHeader("Content-Type", "application/json");
      response.end("[]");
      return;
    }
    assert.equal(request.method, "POST");
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => {
      assert.deepEqual(JSON.parse(body), {
        subdomain: "kinder-prueba",
        directory: "educore",
        is_using_public_directory: false,
      });
      response.statusCode = 200;
      response.end();
    });
  }, async (apiBaseURL) => {
    const result = await ensureHostingerSubdomain(config(apiBaseURL), "kinder-prueba");
    assert.equal(result.status, "created");
  });
  assert.equal(requestCount, 2);
});

test("keeps an existing subdomain with the expected root", async () => {
  await withServer((_request, response) => {
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify([{
      domain: "kinder-prueba.onlineu.mx",
      subdomain: "kinder-prueba",
      root_directory: "/home/u550473909/domains/onlineu.mx/public_html/educore",
    }]));
  }, async (apiBaseURL) => {
    const result = await ensureHostingerSubdomain(config(apiBaseURL), "kinder-prueba");
    assert.equal(result.status, "existing");
  });
});

test("rejects an existing subdomain mapped to a different root", async () => {
  await withServer((_request, response) => {
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify([{
      domain: "kinder-prueba.onlineu.mx",
      subdomain: "kinder-prueba",
      root_directory: "/home/u550473909/domains/onlineu.mx/public_html/otra-carpeta",
    }]));
  }, async (apiBaseURL) => {
    await assert.rejects(
      ensureHostingerSubdomain(config(apiBaseURL), "kinder-prueba"),
      /apunta a otro directorio/
    );
  });
});

test("slug and root validation match production rules", () => {
  assert.equal(validateSlug("kinder-prueba"), "kinder-prueba");
  assert.throws(() => validateSlug("api"), /reservado/);
  assert.throws(() => validateSlug("kinder--prueba"), /guiones válidos/);
  assert.equal(
    rootMatchesDirectory("/home/u550473909/domains/onlineu.mx/public_html/educore", "educore"),
    true
  );
});
