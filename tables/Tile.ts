import { AnyTxtRecord } from "dns";
import { Knex } from "knex";
import { HomeTileIdentifiers } from "../types/HomeTileIdentifiers";

export interface Tile{
    Guid:string,
    Identifier:string,
}

export enum TileMembers{
    Guid = 'Guid',
    Identifier = 'Identifier',
}


export const _CreateTileTableFunc = function(table:Knex.CreateTableBuilder){
        table.string(TileMembers.Guid).primary().unique()
        table.string(TileMembers.Identifier).unique()
}

