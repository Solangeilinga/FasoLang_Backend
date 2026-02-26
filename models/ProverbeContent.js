import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const ProverbeContent = sequelize.define("proverbe_contents", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  proverbeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "proverbes",
      key: "id",
    },
    onDelete: "CASCADE",
  },
  languageId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "langages",
      key: "id",
    },
    onDelete: "CASCADE",
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  audioUrl: DataTypes.STRING(255),
  meaning: DataTypes.STRING(255),
}, {
  tableName: "proverbe_contents",
  timestamps: true, 
  indexes: [
    { unique: true, fields: ["proverbeId", "languageId"] },
  ],
});

export default ProverbeContent;