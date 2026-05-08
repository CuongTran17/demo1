const fs = require('fs');
const path = require('path');
require('dotenv').config();
const mysql = require('mysql2/promise');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function main(){
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || 'NTHair935@';
  const database = process.env.DB_NAME || 'ptit_learning';

  const conn = await mysql.createConnection({ host, port, user, password, database, multipleStatements: true });
  console.log('Connected to MySQL at', host+':'+port, 'db=', database);

  // Collect migration files in this folder (02-*.sql etc.)
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for(const f of files){
    const p = path.join(MIGRATIONS_DIR, f);
    console.log('\n--- Applying', f);
    const sql = fs.readFileSync(p, 'utf8');
    try{
      await conn.query(sql);
      console.log('OK');
    }catch(err){
      console.error('ERROR applying', f, err.message);
    }
  }

  console.log('\n--- Integrity checks (counts and sample rows)');

  const checks = [
    { name: 'reviews_missing_users', sql: `SELECT COUNT(*) AS cnt FROM reviews r LEFT JOIN users u ON r.user_id=u.user_id WHERE u.user_id IS NULL;` , sample: `SELECT r.review_id, r.user_id, r.course_id FROM reviews r LEFT JOIN users u ON r.user_id=u.user_id WHERE u.user_id IS NULL LIMIT 10;` },
    { name: 'reviews_missing_courses', sql: `SELECT COUNT(*) AS cnt FROM reviews r LEFT JOIN courses c ON r.course_id=c.course_id WHERE c.course_id IS NULL;`, sample: `SELECT r.review_id, r.user_id, r.course_id FROM reviews r LEFT JOIN courses c ON r.course_id=c.course_id WHERE c.course_id IS NULL LIMIT 10;` },
    { name: 'quizzes_missing_courses', sql: `SELECT COUNT(*) AS cnt FROM quizzes q LEFT JOIN courses c ON q.course_id=c.course_id WHERE c.course_id IS NULL;`, sample: `SELECT q.quiz_id, q.course_id FROM quizzes q LEFT JOIN courses c ON q.course_id=c.course_id WHERE c.course_id IS NULL LIMIT 10;` },
    { name: 'blogs_created_by_missing', sql: `SELECT COUNT(*) AS cnt FROM blogs b LEFT JOIN users u ON b.created_by=u.user_id WHERE b.created_by IS NOT NULL AND u.user_id IS NULL;`, sample: `SELECT b.blog_id, b.created_by FROM blogs b LEFT JOIN users u ON b.created_by=u.user_id WHERE b.created_by IS NOT NULL AND u.user_id IS NULL LIMIT 10;` },
    { name: 'blogs_updated_by_missing', sql: `SELECT COUNT(*) AS cnt FROM blogs b LEFT JOIN users u ON b.updated_by=u.user_id WHERE b.updated_by IS NOT NULL AND u.user_id IS NULL;`, sample: `SELECT b.blog_id, b.updated_by FROM blogs b LEFT JOIN users u ON b.updated_by=u.user_id WHERE b.updated_by IS NOT NULL AND u.user_id IS NULL LIMIT 10;` },
    { name: 'contact_resolved_by_missing', sql: `SELECT COUNT(*) AS cnt FROM contact_messages m LEFT JOIN users u ON m.resolved_by=u.user_id WHERE m.resolved_by IS NOT NULL AND u.user_id IS NULL;`, sample: `SELECT m.message_id, m.resolved_by FROM contact_messages m LEFT JOIN users u ON m.resolved_by=u.user_id WHERE m.resolved_by IS NOT NULL AND u.user_id IS NULL LIMIT 10;` },
  ];

  const suggestions = [];

  for(const c of checks){
    try{
      const [rows] = await conn.query(c.sql);
      const cnt = rows[0].cnt || 0;
      console.log(`\n${c.name}: ${cnt}`);
      if(cnt>0){
        const [sampleRows] = await conn.query(c.sample);
        console.table(sampleRows);

        // Build a safe suggestion for fix
        if(c.name === 'blogs_created_by_missing' || c.name === 'blogs_updated_by_missing' || c.name === 'contact_resolved_by_missing'){
          // these foreign keys are ON DELETE SET NULL in migration -> suggest UPDATE to NULL
          const col = c.name.includes('created') ? 'created_by' : (c.name.includes('updated') ? 'updated_by' : 'resolved_by');
          const table = c.name.includes('contact') ? 'contact_messages' : 'blogs';
          suggestions.push(`-- Set missing ${col} to NULL in ${table}\nUPDATE ${table} SET ${col}=NULL WHERE ${col} IS NOT NULL AND ${col} NOT IN (SELECT user_id FROM users);\n`);
        }else if(c.name === 'reviews_missing_users' || c.name === 'reviews_missing_courses' || c.name === 'quizzes_missing_courses'){
          // These have NOT NULL + FK with ON DELETE CASCADE -> suggest deleting orphan rows (dangerous)
          if(c.name.startsWith('reviews')){
            suggestions.push(`-- Delete orphan reviews that reference missing users or courses\nDELETE FROM reviews WHERE user_id NOT IN (SELECT user_id FROM users) OR course_id NOT IN (SELECT course_id FROM courses);\n`);
          }else if(c.name.startsWith('quizzes')){
            suggestions.push(`-- Delete orphan quizzes that reference missing courses\nDELETE FROM quizzes WHERE course_id NOT IN (SELECT course_id FROM courses);\n`);
          }
        }
      }
    }catch(err){
      console.error('Check failed', c.name, err.message);
    }
  }

  const outPath = path.join(__dirname, 'fix-suggestions.sql');
  if(suggestions.length>0){
    fs.writeFileSync(outPath, suggestions.join('\n'), 'utf8');
    console.log('\nFix suggestions written to', outPath);
  } else {
    console.log('\nNo issues detected by checks.');
  }

  await conn.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
