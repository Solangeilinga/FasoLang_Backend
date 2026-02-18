import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const User = sequelize.define("users", {
    id: {
        type: DataTypes.INTEGER,   // 👈 même type ici
        autoIncrement: true,
        primaryKey: true,
    },
    firstname: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },

    lastname: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    email: {
  type: DataTypes.STRING(100),
  allowNull: false,
  unique: true,
  validate: {
    isEmail: true,
  },
},

    numero: {
        type: DataTypes.STRING(15),
        allowNull: false,
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    reset_code: {
  type: DataTypes.STRING(255),
  allowNull: true,
},
reset_code_expiry: { type: DataTypes.BIGINT, allowNull: true },
  reset_code_attempts: { type: DataTypes.INTEGER, defaultValue: 0 },

    role: {
        type: DataTypes.ENUM("admin", "user"),
        defaultValue: "user",
    },
    avatarUrl: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    lastActivity: {
        type: DataTypes.DATE,
        allowNull: true
    },
    dailyStreak: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    tableName: "users",
    timestamps: true

}
);

export default User;