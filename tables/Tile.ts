import { AnyTxtRecord } from "dns";
import { Knex } from "knex";
import { HomeTileIdentifiers } from "../types/HomeTileIdentifiers";

export interface Tile{
    id:string,
    Guid:string,
    Identifier:string,
}

export enum TileMembers{
    id = 'id',
    Guid = 'Guid',
    Identifier = 'Identifier',
}


export const _CreateTileTableFunc = function(table:Knex.CreateTableBuilder){
        table.increments(TileMembers.id)
        table.string(TileMembers.Guid)
        table.string(TileMembers.Identifier)
}

