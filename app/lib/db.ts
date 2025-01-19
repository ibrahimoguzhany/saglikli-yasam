import bcrypt from 'bcryptjs';
import { getDb, formatQueryResult } from './db.config';

// Initialize database connection
let db: any = null;

// Initialize database asynchronously
const initDb = async () => {
  if (!db) {
    db = await getDb();
  }
  return db;
};

// Helper function to execute queries
async function executeQuery(query: string, params: any[] = []) {
  const database = await initDb();
  const result = await database.query(query, params);
  return formatQueryResult(result);
}

// User operations
export async function createUser(data: {
  email: string;
  password: string;
  name: string;
  role?: string;
}) {
  const hashedPassword = await bcrypt.hash(data.password, 10);
  
  const query = `
    INSERT INTO users (email, password, name, role)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `;
  
  try {
    const result = await executeQuery(query, [
      data.email,
      hashedPassword,
      data.name,
      data.role || 'user'
    ]);
    return { id: result[0]?.id };
  } catch (error: any) {
    if (error.code === '23505') {
      throw new Error('Bu e-posta adresi zaten kullanımda');
    }
    throw error;
  }
}

// Verify user
export async function verifyUser(email: string, password: string) {
  const query = 'SELECT * FROM users WHERE email = $1';
  const users = await executeQuery(query, [email]);
  const user = users[0];

  if (!user) {
    return null;
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return null;
  }

  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

// Get user by ID
export async function getUserById(id: number) {
  const query = 'SELECT id, email, name, role, created_at FROM users WHERE id = $1';
  const users = await executeQuery(query, [id]);
  return users[0];
}

// Tips operations
export async function getTips() {
  const query = `
    SELECT id, title, content, category, date
    FROM tips
    ORDER BY date DESC
  `;
  return executeQuery(query);
}

export async function getTipById(id: number) {
  const query = `
    SELECT id, title, content, category, date
    FROM tips
    WHERE id = $1
  `;
  const tips = await executeQuery(query, [id]);
  return tips[0];
}

// Reminders operations
export async function createReminder(userId: number, data: {
  title: string;
  time: string;
  type: string;
  isActive?: boolean;
}) {
  const query = `
    INSERT INTO reminders (user_id, title, time, type, is_active)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, title, time, type, is_active
  `;
  
  const result = await executeQuery(query, [
    userId,
    data.title,
    data.time,
    data.type,
    data.isActive ?? true
  ]);
  
  return result[0];
}

export async function getReminders(userId: number) {
  const query = `
    SELECT id, title, time, type, is_active
    FROM reminders
    WHERE user_id = $1
    ORDER BY time ASC
  `;
  
  return executeQuery(query, [userId]);
}

export async function updateReminder(userId: number, reminderId: number, data: {
  isActive: boolean;
}) {
  const query = `
    UPDATE reminders
    SET is_active = $1
    WHERE id = $2 AND user_id = $3
    RETURNING id
  `;
  
  const result = await executeQuery(query, [data.isActive, reminderId, userId]);
  return result[0];
}

export async function deleteReminder(userId: number, reminderId: number) {
  const query = `
    DELETE FROM reminders
    WHERE id = $1 AND user_id = $2
    RETURNING id
  `;
  
  const result = await executeQuery(query, [reminderId, userId]);
  return result[0];
}

// Health data operations
export async function upsertHealthData(userId: number, data: {
  steps: number;
  waterIntake: number;
  sleepHours: number;
  sleepQuality: number;
}) {
  const today = new Date().toISOString().split('T')[0];
  
  const query = `
    INSERT INTO health_data (user_id, date, steps, water_intake, sleep_hours, sleep_quality)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (user_id, date) 
    DO UPDATE SET 
      steps = EXCLUDED.steps,
      water_intake = EXCLUDED.water_intake,
      sleep_hours = EXCLUDED.sleep_hours,
      sleep_quality = EXCLUDED.sleep_quality
    RETURNING id
  `;
  
  const result = await executeQuery(query, [
    userId,
    today,
    data.steps,
    data.waterIntake,
    data.sleepHours,
    data.sleepQuality
  ]);
  
  return result[0];
}

export async function getHealthData(userId: number) {
  const query = `
    SELECT date, steps, water_intake as "waterIntake", 
           sleep_hours as "sleepHours", sleep_quality as "sleepQuality"
    FROM health_data
    WHERE user_id = $1
    ORDER BY date DESC
    LIMIT 7
  `;
  
  return executeQuery(query, [userId]);
}

// Tips management
export async function createTip(data: { 
  title: string; 
  content: string; 
  category: string; 
  date: string; 
}) {
  const query = `
    INSERT INTO tips (title, content, category, date)
    VALUES ($1, $2, $3, $4)
    RETURNING id, title, content, category, date
  `;
  
  const result = await executeQuery(query, [
    data.title,
    data.content,
    data.category,
    data.date
  ]);
  
  return result[0];
}

export async function updateTip(id: number, data: { 
  title: string; 
  content: string; 
  category: string; 
  date: string; 
}) {
  const query = `
    UPDATE tips 
    SET title = $1, content = $2, category = $3, date = $4
    WHERE id = $5
    RETURNING id, title, content, category, date
  `;
  
  const result = await executeQuery(query, [
    data.title,
    data.content,
    data.category,
    data.date,
    id
  ]);
  
  return result[0] || null;
}

export async function deleteTip(id: number) {
  const query = 'DELETE FROM tips WHERE id = $1 RETURNING id';
  const result = await executeQuery(query, [id]);
  return result[0] != null;
}

export { db }; 