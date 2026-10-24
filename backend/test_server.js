const http = require('node:http');
const { app } = require('./server');

const testPort = 3099;
const server = app.listen(testPort, '127.0.0.1', async () => {
  console.log(`Test server running on port ${testPort}`);

  try {
    // 1. Test POST /api/report
    console.log('Test 1: Submitting sample diagnostic report...');
    const samplePayload = {
      deviceId: "TEST-PHONE-9988",
      timestamp: new Date().toISOString(),
      battery: {
        level: 87.5,
        status: "Discharging",
        health: "Good",
        temperatureC: 32.4,
        voltageMV: 4120,
        technology: "Li-ion",
        chargingType: "تفريغ الشحن (Discharging)",
        capacityMAh: 5000,
        chargeCounter: 4375000,
        isCharging: false
      },
      hardware: {
        manufacturer: "Samsung",
        brand: "Samsung",
        model: "Galaxy S24 Ultra",
        device: "e3q",
        buildId: "UP1A.231005.007",
        osVersion: "Android 14 (SDK 34)",
        securityPatch: "2026-10-01",
        isRooted: false,
        cpuCores: 8,
        cpuArchitecture: "arm64-v8a",
        cpuModel: "Snapdragon 8 Gen 3",
        totalRamMB: 12288,
        freeRamMB: 6144,
        usedRamMB: 6144,
        isLowMemory: false,
        totalStorageGB: 512,
        freeStorageGB: 340
      },
      display: {
        width: 1440,
        height: 3120,
        dpi: 505,
        refreshRateHz: 120,
        resolution: "1440 x 3120"
      },
      network: {
        connectionType: "WiFi (واي فاي)",
        localIp: "192.168.1.115",
        wifiName: "Connected"
      },
      sensors: {
        accelerometer: { x: 0.12, y: 9.78, z: 0.45 },
        gyroscope: { x: 0.01, y: -0.02, z: 0.0 }
      }
    };

    const postRes = await makeRequest('POST', '/api/report', samplePayload);
    console.log('POST /api/report Response:', postRes);
    if (!postRes.body.success) throw new Error('POST /api/report failed');
    const insertedId = postRes.body.data.id;

    // 2. Test GET /api/reports
    console.log('Test 2: Fetching reports...');
    const getRes = await makeRequest('GET', '/api/reports');
    console.log(`GET /api/reports returned ${getRes.body.data.length} reports.`);
    if (!getRes.body.data.some(r => r.id === insertedId)) {
      throw new Error('Inserted report not found in reports list');
    }

    // 3. Test GET /api/stats
    console.log('Test 3: Fetching stats...');
    const statsRes = await makeRequest('GET', '/api/stats');
    console.log('Stats:', statsRes.body.data);
    if (statsRes.body.data.totalDevices < 1) throw new Error('Stats device count invalid');

    // 4. Test GET /api/reports/:id
    console.log(`Test 4: Fetching single report #${insertedId}...`);
    const detailRes = await makeRequest('GET', `/api/reports/${insertedId}`);
    if (!detailRes.body.data || detailRes.body.data.brand !== 'Samsung') {
      throw new Error('Single report fetch mismatch');
    }
    console.log('Single report verified successfully! Brand:', detailRes.body.data.brand);

    // 5. Test Deep Link Asset Links
    console.log('Test 5: Testing Android AssetLinks...');
    const assetlinksRes = await makeRequest('GET', '/.well-known/assetlinks.json');
    if (!Array.isArray(assetlinksRes.body) || assetlinksRes.body[0].target.package_name !== 'com.ktaab.diagnostics') {
      throw new Error('AssetLinks metadata invalid');
    }
    console.log('AssetLinks verified successfully!');

    console.log('\n=======================================');
    console.log('🎉 ALL BACKEND TESTS PASSED SUCCESSFULLY!');
    console.log('=======================================\n');

  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: testPort,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
        }
      },
      (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}
