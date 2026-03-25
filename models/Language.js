import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Language = sequelize.define("languages", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: "languages", // Correction orthographique
  timestamps: true,
});

export default Language;