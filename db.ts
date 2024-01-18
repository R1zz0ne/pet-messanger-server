import pg from "pg";

const Pool = pg.Pool;

const db = new Pool({
    user: "postgres",
    password: "Qwerty123",
    host: "postgredb",
    port: 5432,
    database: "postgres"
})

export default db;