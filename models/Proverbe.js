import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Proverbe = sequelize.define("proverbes", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  image: DataTypes.STRING(255),
  theme: { // Ajout d'un champ pour le thème
    type: DataTypes.STRING(255),
    allowNull: false,
  },
}, {
  tableName: "proverbes",
  timestamps: false,
});

export default Proverbe;