// One shared sample database for the explainer and the table peek, created on first use so sql.js loads lazily.
import type { Database } from 'sql.js'
import { createPracticeDb } from '../db'

let p: Promise<Database> | null = null
export const getDb = (): Promise<Database> => (p ??= createPracticeDb().catch(e => { p = null; throw e }))
