const express = require("express");
const router = express.Router({});

router.get('/health', async (_req, res, _next) => {
   // console.log('/healthcheck');
    var fullUrl = _req.protocol + '://' + _req.get('host') + _req.originalUrl;
    console.log("Full url" + fullUrl);

    const healthcheck = {
        uptime: process.uptime(),
        responsetime: process.hrtime(),
        message: 'OK',
        timestamp: Date.now()
    };
    try {
        res.status(200).send(healthcheck);
    } catch (error) {
        healthcheck.message = error;
        res.status(503).send();
    }
});
// export router with all routes included
module.exports = router;