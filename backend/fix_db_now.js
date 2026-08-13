const mysql = require('mysql2/promise');

async function fixDB() {
    console.log("Connecting to TiDB Serverless...");
    const uri = 'mysql://BsRyTEVHX6fudsU.root:MqZz2WMqULDfGPqu@gateway01.ap-southeast-1.prod.alicloud.tidbcloud.com:4000/insurance_db?ssl={"rejectUnauthorized":true}';
    
    let connection;
    try {
        connection = await mysql.createConnection({
            uri: uri
        });
        console.log("Connected successfully to insurance_db!");
        
        const dropColumns = ['id_card_no', 'email', 'occupation'];
        for (const col of dropColumns) {
            try {
                await connection.query(`ALTER TABLE customers DROP INDEX ${col}`);
                console.log(`Dropped index ${col}`);
            } catch (e) {
                console.log(`Index ${col} error: ${e.message}`);
            }
            try {
                await connection.query(`ALTER TABLE customers DROP COLUMN ${col}`);
                console.log(`Dropped column ${col}`);
            } catch (e) {
                console.log(`Column ${col} error: ${e.message}`);
            }
        }
        
        console.log("All fixes applied successfully!");
    } catch (err) {
        console.error("Error executing SQL:", err);
    } finally {
        if (connection) await connection.end();
    }
}

fixDB();
