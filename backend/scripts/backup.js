require('dotenv').config();
const mysqldump = require('mysqldump');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const BACKUP_DIR = path.join(__dirname, '../backups');

// Make sure backup dir exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR);
}

// Parse DB URL
const dbUrl = new URL(process.env.DB_URI);
const dbConfig = {
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port) || 3306,
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.replace('/', ''),
    ssl: {
        rejectUnauthorized: true
    }
};

const getTimestamp = () => {
    const now = new Date();
    return now.toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
};

const backupDatabase = async () => {
    const timestamp = getTimestamp();
    const filename = `db_backup_${timestamp}.sql`;
    const filepath = path.join(BACKUP_DIR, filename);

    console.log(`[Backup] Starting database backup to ${filename}...`);
    try {
        await mysqldump({
            connection: dbConfig,
            dumpToFile: filepath,
        });
        console.log(`[Backup] Database backup completed: ${filepath}`);
        return filepath;
    } catch (err) {
        console.error('[Backup] Database backup failed:', err);
        throw err;
    }
};
const { ZipArchive } = require('archiver');

const backupUploads = () => {
    return new Promise((resolve, reject) => {
        const timestamp = getTimestamp();
        const filename = `uploads_backup_${timestamp}.zip`;
        const filepath = path.join(BACKUP_DIR, filename);
        
        console.log(`[Backup] Starting uploads backup to ${filename}...`);
        
        const uploadsDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadsDir)) {
            console.warn('[Backup] Uploads directory not found, skipping.');
            return resolve(null);
        }

        const output = fs.createWriteStream(filepath);
        const archive = new ZipArchive({
            zlib: { level: 9 }
        });

        output.on('close', function() {
            console.log(`[Backup] Uploads backup completed: ${filepath} (${archive.pointer()} total bytes)`);
            resolve(filepath);
        });

        archive.on('error', function(err) {
            console.error('[Backup] Uploads backup failed:', err);
            reject(err);
        });

        archive.pipe(output);
        archive.directory(uploadsDir, false);
        archive.finalize();
    });
};

const manageRetention = (prefix, keepCount) => {
    const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith(prefix))
        .map(f => ({ name: f, path: path.join(BACKUP_DIR, f), ctime: fs.statSync(path.join(BACKUP_DIR, f)).ctime }))
        .sort((a, b) => b.ctime - a.ctime); // Descending by creation time (newest first)

    if (files.length > keepCount) {
        const filesToDelete = files.slice(keepCount);
        for (const file of filesToDelete) {
            try {
                fs.unlinkSync(file.path);
                console.log(`[Backup] Deleted old backup: ${file.name}`);
            } catch (err) {
                console.error(`[Backup] Failed to delete old backup ${file.name}:`, err);
            }
        }
    }
};

const runFullBackup = async () => {
    console.log('=== STARTING FULL BACKUP ===');
    try {
        await backupDatabase();
        await backupUploads();
        
        // Retention: Keep last 14 days of DB backups and last 7 days of upload backups
        manageRetention('db_backup_', 14);
        manageRetention('uploads_backup_', 7);
        
        console.log('=== FULL BACKUP COMPLETED ===');
    } catch (err) {
        console.error('=== FULL BACKUP FAILED ===', err);
    }
};

const runIncrementalBackup = async () => {
    console.log('=== STARTING INCREMENTAL BACKUP (DB ONLY) ===');
    try {
        await backupDatabase();
        manageRetention('db_backup_', 14);
        console.log('=== INCREMENTAL BACKUP COMPLETED ===');
    } catch (err) {
        console.error('=== INCREMENTAL BACKUP FAILED ===', err);
    }
};

// Check arguments
const arg = process.argv[2];
if (arg === 'full') {
    runFullBackup();
} else if (arg === 'incremental') {
    runIncrementalBackup();
} else {
    console.log('Please specify "full" or "incremental". Example: node backup.js full');
}
