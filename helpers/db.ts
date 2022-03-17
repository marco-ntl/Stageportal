import knex, { Knex } from "knex";
import { Tile, TileMembers, _CreateTileTableFunc } from "../tables/Tile";
import { HomeTileIdentifiers } from "../types/HomeTileIdentifiers";

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

    static Table<T>(tableName:Tables):Knex.QueryBuilder<T>{ //@TODO untested
        return DB.conn<T>(tableName)
    }

    static async CreateTilesTable() { //@TODO untested
        return await DB.conn.schema.createTable(Tables.Tiles, _CreateTileTableFunc)
    }

    static async IsTableEmpty(table:Tables):Promise<boolean>{ //@TODO untested
        return (await DB.Table<object>(table).first() === undefined)
    }

    static async TableExists(table:Tables):Promise<boolean>{
        return await DB.conn.schema.hasTable(table)
    }

    static async InsertTile(tile:Tile){
        return await DB.Table(Tables.Tiles).insert(tile)
    }

    static async GetTileByIdentifier(identifier:HomeTileIdentifiers):Promise<false|Tile>{
        const result:Tile|undefined = await DB.Table<Tile>(Tables.Tiles).where(TileMembers.Identifier, identifier).select<Tile>(TileMembers.Guid, TileMembers.Identifier).first()
        if(!result)
            return false
        return result
    }


}

export enum Tables {
    Tiles = 'tiles',
}