require("dotenv").config();

const { MongoClient } = require("mongodb");
// const uri = `mongodb://${process.env.DATABASE_USER}:${encodeURIComponent(process.env.DATABASE_PASSWORD)}@${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}/admin`;

const uri = `mongodb://mongoose:Mongoose123!%40%23@139.59.18.212:27017/?authMechanism=DEFAULT`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

function DBConnection(callback) {
  client.connect((err) => {
    if (err) {
      console.error(err);
    } else {
      /* Global DB connection */
      global.DB = client.db(process.env.DATABASE);
      console.log("🔌️ Database Connection has been established successfully!");
      callback();
    }
  });
}

module.exports = DBConnection;
