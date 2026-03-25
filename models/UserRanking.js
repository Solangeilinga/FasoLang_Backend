// ===============================
// models/UserRankings.js
// ===============================
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const UserRanking = sequelize.define("user_rankings", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "users", 
      key: "id",
    },
  },
  languageId: {
  type: DataTypes.INTEGER,
  allowNull: false,
  references: {
    model: "languages",
    key: "id",
  },
  onDelete: "CASCADE",
},

  total_score: {
    type: DataTypes.INTEGER, 
    defaultValue: 0
  },
  rank_position: {
    type: DataTypes.INTEGER, 
    defaultValue: 0
  }

}, {
  tableName: "user_rankings",
  timestamps: true,
  indexes: [
  {
    unique: true,
    fields: ["userId", "languageId"],
  },
],

});

export default UserRanking;