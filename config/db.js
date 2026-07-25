import Sequelize from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

const sequelize = connectionString
  ? new Sequelize(connectionString, {
      dialect: "postgres",
      protocol: "postgres",
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
      logging: false,
    })
  : null;

export default sequelize;
