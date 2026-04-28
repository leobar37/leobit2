/**
 * Database Backup Script
 * 
 * Creates a complete backup of all database tables to JSON.
 * Usage: bun run scripts/backup-db.ts
 */

import { db } from "../src/lib/db";
import {
  customers,
  sales,
  saleItems,
  abonos,
  products,
  productVariants,
  businesses,
  businessUsers,
  assets,
  files,
  distribuciones,
  distribucionItems,
  suppliers,
  purchases,
  purchaseItems,
  staffInvitations,
  systemConfig,
  businessPaymentSettings,
  businessUserWhatsAppSettings,
  whatsAppTemplates,
  whatsAppMessages,
] as const;

type TableName = typeof TABLES[number];

const tableMap: Record<TableName, unknown> = {
  businesses,
  businessUsers,
  userProfiles,
  customers,
  tags,
  customerTags,
  sales,
  saleItems,
  abonos,
  saleTokens,
  products,
  productVariants,
  productUnits,
  assets,
  files,
  distribuciones,
  distribucionItems,
  suppliers,
  purchases,
  purchaseItems,
  staffInvitations,
  systemConfig,
  businessPaymentSettings,
  businessUserWhatsAppSettings,
  whatsAppTemplates,
  whatsAppMessages,
};

async function exportTable(tableName: TableName): Promise<unknown[]> {
  const table = tableMap[tableName];
  
  try {
    const result = await db.select().from(table as never);
    console.log(`  - ${tableName}: ${result.length} records`);
    return result;
  } catch (error) {
    console.error(`  - ${tableName}: ERROR - ${error instanceof Error ? error.message : 'Unknown error'}`);
    return [];
  }
}

async function createBackup(): Promise<BackupData> {
  console.log('Starting database backup...\n');
  
  const backup: BackupData = {
    metadata: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'postgresql',
      tables: [...TABLES],
    },
    tables: {},
  };

  for (const tableName of TABLES) {
    console.log(`Exporting ${tableName}...`);
    backup.tables[tableName] = await exportTable(tableName);
  }

  const totalRecords = Object.values(backup.tables).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`\nTotal records: ${totalRecords}`);

  return backup;
}

function generateChecksum(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function saveBackup(backup: BackupData): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `pre-migration-${timestamp}.json`;
  
  // Save to backups directory at project root
  const backupsDir = path.join(projectRoot, 'backups');
  
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
  
  // First, create the backup without checksum to compute it
  const backupWithoutChecksum = {
    metadata: backup.metadata,
    tables: backup.tables,
  };
  
  const jsonString = JSON.stringify(backupWithoutChecksum, null, 2);
  const checksum = generateChecksum(jsonString);
  
  // Now add checksum and save
  const backupWithChecksum: BackupData = {
    ...backup,
    checksum,
    checksumAlgorithm: 'SHA-256',
  };
  
  const filepath = path.join(backupsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(backupWithChecksum, null, 2));
  
  console.log(`\nBackup saved to: ${filepath}`);
  console.log(`Checksum: ${checksum}`);
  console.log(`File size: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB`);
  
  return filepath;
}

async function main() {
  try {
    const backup = await createBackup();
    const filepath = await saveBackup(backup);
    
    console.log('\n✅ Backup completed successfully!');
    console.log(`📁 File: ${filepath}`);
  } catch (error) {
    console.error('\n❌ Backup failed:', error);
    process.exit(1);
  }
}

main();
