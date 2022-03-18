//Généré automatiquement via https://app.quicktype.io/?l=ts
export interface PersonSearchResponse {
    Count:       number;
    Items:       Item[];
    DebugOutput: null;
}

export interface Item {
    $Class$:                      Class;
    $IsNew$:                      IsNew;
    $Id$:                         DisplayName;
    $DisplayName$:                DisplayName;
    $LastModified$:               DisplayName;
    $TimeAdded$:                  DisplayName;
    UserPrincipalName:            DisplayName;
    UserLogonName:                DisplayName;
    DisplayName:                  DisplayName;
    $TypeProjection$:             DisplayName;
    PersonHasManager:             PersonHasManager | null;
    PersonHasPrimaryADAccount:    Person;
    PersonHasDefaultCulture:      null;
    PersonIsAssignedToCostCenter: Person | null;
    PersonWorksAtLocation:        null;
    PersonWorksForOrganization:   null;
}

export interface Class {
    Name:          ClassName;
    Id:            string;
    DisplayName:   ClassDisplayName;
    Description:   string;
    Value:         string;
    ValueAsBigInt: string;
    Type:          ClassType;
    AccessRights:  AccessRights;
    MaxLength:     number;
    IsDirty:       boolean;
}

export enum AccessRights {
    Read = "Read",
    Unknown = "Unknown",
}

export enum ClassDisplayName {
    CostCenter = "Cost Center",
    Person = "Person",
    UtilisateurOuGroupeDeDomaine = "Utilisateur ou groupe de domaine",
}

export enum ClassName {
    ItnetXAssetManagementCostCenter = "itnetX.AssetManagement.CostCenter",
    ItnetXAssetManagementPerson = "itnetX.AssetManagement.Person",
    SystemDomainUser = "System.Domain.User",
}

export enum ClassType {
    ManagementPackClass = "ManagementPackClass",
}

export interface DisplayName {
    Name:          DisplayNameName;
    Value:         string;
    ValueAsBigInt: string;
    Type:          DisplayNameType;
    AccessRights:  AccessRights;
    MaxLength:     number;
    IsDirty:       boolean;
    Id?:           string;
    DisplayName?:  DisplayNameDisplayName;
    Description?:  Description;
    EnumName?:     string;
}

export enum Description {
    NomCompletDeLObjet = "Nom complet de l'objet.",
}

export enum DisplayNameDisplayName {
    ItnetXAssetManagementPersonViewTypeProjection = "itnetX.AssetManagement.Person.View.TypeProjection",
    NomComplet = "Nom complet",
    UserLogonName = "User Logon Name",
    UserPrincipalName = "User Principal Name",
}

export enum DisplayNameName {
    DisplayName = "$DisplayName$",
    ID = "$Id$",
    ItnetXAssetManagementPersonViewTypeProjection = "itnetX.AssetManagement.Person.View.TypeProjection",
    LastModified = "$LastModified$",
    NameDisplayName = "DisplayName",
    TimeAdded = "$TimeAdded$",
    UserLogonName = "UserLogonName",
    UserPrincipalName = "UserPrincipalName",
}

export enum DisplayNameType {
    DateTime = "DateTime",
    GUID = "Guid",
    ManagementPackTypeProjection = "ManagementPackTypeProjection",
    String = "String",
}

export interface IsNew {
    Name:          IsNewName;
    DisplayName:   string;
    Value:         boolean;
    ValueAsBigInt: string;
    Type:          IsNewType;
    AccessRights:  AccessRights;
    MaxLength:     number;
    IsDirty:       boolean;
}

export enum IsNewName {
    IsNew = "$IsNew$",
}

export enum IsNewType {
    Boolean = "Boolean",
}

export interface PersonHasManager {
    $Class$:           Class;
    $IsNew$:           IsNew;
    $Id$:              DisplayName;
    $DisplayName$:     DisplayName;
    $LastModified$:    DisplayName;
    $TimeAdded$:       DisplayName;
    UserPrincipalName: DisplayName;
    UserLogonName:     DisplayName;
    DisplayName:       DisplayName;
    $ComponentPath$:   ComponentPath;
}

export interface ComponentPath {
    Relationship:     string;
    TargetConstraint: null;
    SeedRole:         SeedRole;
}

export enum SeedRole {
    Source = "Source",
}

export interface Person {
    $Class$:         Class;
    $IsNew$:         IsNew;
    $Id$:            DisplayName;
    $DisplayName$:   DisplayName;
    $LastModified$:  DisplayName;
    $TimeAdded$:     DisplayName;
    $ComponentPath$: ComponentPath;
}
