import knex, { Knex } from "knex";
import { Tile, TileMembers, _CreateTileTableFunc } from "../tables/Tile";
import { HomeTileIdentifiers } from "../const/HomeTileIdentifiers";

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
    
    /**
     * Créé une connexion à la DB. Ne devrait être appelé qu'une seule fois, l'objet étant un singleton
     *
     * @private
     * @return {*}  {Knex}
     * @memberof DB
     */
    private createConnection():Knex{
        return require('knex')({
            client: 'sqlite3', // or 'sqlite3'
            connection: {
                filename: DB_FILE_NAME
            }
        });
    }
    
    /**
     * Retourne la connexion à la DB. Si celle-ci n'existe pas, l'initialise
     *
     * @readonly
     * @static
     * @memberof DB
     */
    static get conn(){
        if(!DB._conn)
            DB._instance = new DB() //@CLEANUP Nécessaire???
        return DB._conn
    }

    /**
     * La table sur laquelle la query va agir
     *
     * @static
     * @template T Le type de retour
     * @param {Tables} tableName Le nom de la table
     * @return {*}  {Knex.QueryBuilder<T>}
     * @memberof DB
     */
    static Table<T>(tableName:Tables):Knex.QueryBuilder<T>{
        return DB.conn<T>(tableName)
    }

    /**
     * Créé la table "Tiles"
     *
     * @static
     * @return {*} 
     * @memberof DB
     */
    static async CreateTilesTable() {
        return await DB.conn.schema.createTable(Tables.Tiles, _CreateTileTableFunc)
    }

    /**
     * Retourne True si la table spécifiée est vide
     *
     * @static
     * @param {Tables} table La table à checker
     * @return {*}  {Promise<boolean>} Est-ce que la table est vide
     * @memberof DB
     */
    static async IsTableEmpty(table:Tables):Promise<boolean>{ //@TODO untested
        return (await DB.Table<object>(table).first() === undefined)
    }

    /**
     * Retourne True si la table existe
     *
     * @static
     * @param {Tables} table La table à vérifier
     * @return {*}  {Promise<boolean>} Est-ce que la table existe ?
     * @memberof DB
     */
    static async TableExists(table:Tables):Promise<boolean>{
        return await DB.conn.schema.hasTable(table)
    }

    /**
     * Insère une Tile en DB
     *
     * @static
     * @param {Tile} tile La tuile à insérer
     * @return {*} 
     * @memberof DB
     */
    static async InsertTile(tile:Tile){
        return await DB.Table(Tables.Tiles)
                        .insert(tile)
    }

    /**
     * Retourne l'objet Tile correspondant à l'identifiant spécifié, ou false si celui-ci n'existe pas en DB
     *
     * @static
     * @param {HomeTileIdentifiers} identifier
     * @return {*}  {(Promise<false|Tile>)}
     * @memberof DB
     */
    static async GetTileByIdentifier(identifier:HomeTileIdentifiers):Promise<false|Tile>{
        const result:Tile|undefined = await DB
                                            .Table(Tables.Tiles)
                                            .where(TileMembers.Identifier, identifier)
                                            .select<Tile>(TileMembers.Guid, TileMembers.Identifier)
                                            .first()
        if(!result)
            return false
        return result
    }

}

export enum Tables {
    Tiles = 'tiles',
}