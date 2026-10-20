import {DatabaseSync} from 'node:sqlite';
export const database=new DatabaseSync(':memory:');
database.exec('CREATE TABLE content_revisions(id TEXT PRIMARY KEY,payload TEXT NOT NULL,created_by INTEGER NOT NULL,created_at INTEGER NOT NULL);CREATE TABLE app_state(key TEXT PRIMARY KEY,value TEXT NOT NULL);CREATE TABLE preferences(user_id INTEGER PRIMARY KEY,payload TEXT NOT NULL,version INTEGER NOT NULL,updated_at INTEGER NOT NULL)');
export const db={
 get:async(sql,args={})=>database.prepare(sql).get(args),
 all:async(sql,args={})=>database.prepare(sql).all(args),
 run:async(sql,args={})=>{const r=database.prepare(sql).run(args);return {rowsAffected:r.changes,lastInsertRowid:r.lastInsertRowid,rows:[]};},
};
export const calls=[];
export const api=new Proxy({}, {get:(_,method)=>async parameters=>{calls.push({method,parameters});return {message_id:123};}});
export class EndpointError extends Error {constructor(message,parameters){super(message);this.parameters=parameters;}}
