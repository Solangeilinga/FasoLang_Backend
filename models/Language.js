import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Language = sequelize.define("languages", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  imageUrl: { type: DataTypes.STRING(500), allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  order: { type: DataTypes.INTEGER, defaultValue: 0 }
}, {
  tableName: "languages",
  timestamps: true,
});

export default Language;