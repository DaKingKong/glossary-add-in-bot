const Sequelize = require('sequelize');
const { sequelize } = require('./sequelize');

// Model for User data
exports.Glossary = sequelize.define('glossaries', {
  name: {
    type: Sequelize.STRING,
    primaryKey: true,
  },
  description: {
    type: Sequelize.STRING,
  },
  reference: {
    type: Sequelize.STRING,
    default: ''
  }
});
