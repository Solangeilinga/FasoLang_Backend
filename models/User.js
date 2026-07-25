import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const User = sequelize.define("users", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    firstname: { type: DataTypes.STRING(255), allowNull: false },
    lastname: { type: DataTypes.STRING(255), allowNull: false },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
    },
    numero: { type: DataTypes.STRING(15), allowNull: false },
    password: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.ENUM("admin", "user"), defaultValue: "user" },
    avatarUrl: { type: DataTypes.STRING(255), allowNull: true },
    totalXp: { 
        type: DataTypes.INTEGER, 
        defaultValue: 0,
        comment: "XP global cumulé pour la scalabilité des classements" 
    },
    dailyStreak: { type: DataTypes.INTEGER, defaultValue: 0 },
    lastActivity: { type: DataTypes.DATE, allowNull: true }
}, {
    tableName: "users",
    timestamps: true
});

export default User;