import knex, { Knex } from "knex";
import { _CreateTileTableFunc } from "../tables/Tile";

export const DB_FILE_NAME = 'data.db'

export default class DB {
    private static _instance: DB;
    private static _conn: Knex

    private constructor() {
        if (DB._instance)
            throw new Error("Use DB.conn instead of new DB()");
        DB._conn = this.createConnection()
        DB._instance = this;
    }
    private createConnection():Knex{
        return require('knex')({
            client: 'better-sqlite3', // or 'sqlite3'
            connection: {
                filename: DB_FILE_NAME
            }
        });
    }
    
    static get conn(){
        if(!DB._conn)
            DB._instance = new DB()
        return DB._conn
    }

    static table<T>(tableName:string):Knex.QueryBuilder<T>{ //@TODO untested
        return DB.conn<T>(tableName)
    }

    static CreateTilesTable() { //@TODO untested
        DB.conn.schema.createTable(Tables.Tiles, _CreateTileTableFunc)
    }

    static IsTableEmpty(table:string):boolean{ //@TODO untested
        return (DB.table<object>(table).first() === undefined)
    }


}

export enum Tables {
    Tiles = 'tiles',
}