require('dotenv').config();
const { Glossary } = require('./glossaryModel');

async function initDB() {
    await Glossary.sync();
}

initDB();
