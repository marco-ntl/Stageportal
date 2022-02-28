//Généré automatiquement via https://app.quicktype.io/?l=ts
export interface SoftwareSearchResponse {
    Count:       number;
    Items:       Item[];
    DebugOutput: null;
}

export interface Item {
    $Class$:                             Class;
    $IsNew$:                             IsNew;
    $Id$:                                DisplayName;
    $DisplayName$:                       DisplayName;
    $LastModified$:                      DisplayName;
    $TimeAdded$:                         DisplayName;
    Version:                             Class;
    Platform:                            Class;
    Region:                              Class;
    DisplayName:                         Class;
    $TypeProjection$:                    DisplayName;
    SoftwareAssetHasLicense:             any[];
    SoftwareAssetHasSoftwareDetails:     ConfigItemHasPrice;
    ConfigItemHasPrice:                  ConfigItemHasPrice;
    SoftwareAssetHasSoftwareItem:        any[];
    SoftwareAssetHasManualSoftwareItem:  any[];
    SoftwareAssetHasPrerequisite:        any[];
    SoftwareAssetHasPrerequisiteSource:  any[];
    SoftwareAssetIsAssignedToConfigItem: any[];
    SoftwareAssetIsInstalledOnDevice:    any[];
    ContractIsAssignedToConfigItem:      any[];
    ImpactedWorkItem:                    any[];
    RelatedWorkItem:                     any[];
    FileAttachment:                      any[];
    RelatedConfigItem:                   any[];
    RelatedConfigItemSource:             any[];
    RelatedKnowledgeArticles:            any[];
}

export interface Class {
    Name:          string;
    Id?:           string;
    DisplayName:   string;
    Description?:  string;
    Value:         string;
    ValueAsBigInt: string;
    Type:          ClassType;
    AccessRights:  AccessRights;
    MaxLength:     number;
    IsDirty:       boolean;
    EnumName?:     string;
    EnumTypeId?:   string;
    EnumId?:       string;
}

export enum AccessRights {
    Read = "Read",
    Unknown = "Unknown",
}

export enum ClassType {
    Enum = "Enum",
    ManagementPackClass = "ManagementPackClass",
    String = "String",
}

export interface DisplayName {
    Name:          Name;
    Value:         string;
    ValueAsBigInt: string;
    Type:          DisplayNameType;
    AccessRights:  AccessRights;
    MaxLength:     number;
    IsDirty:       boolean;
    Id?:           string;
    DisplayName?:  Name;
}

export enum Name {
    DisplayName = "$DisplayName$",
    ID = "$Id$",
    ItnetXAssetManagementSoftwareAssetFullTypeProjection = "itnetX.AssetManagement.SoftwareAsset.Full.TypeProjection",
    LastModified = "$LastModified$",
    TimeAdded = "$TimeAdded$",
}

export enum DisplayNameType {
    DateTime = "DateTime",
    GUID = "Guid",
    ManagementPackTypeProjection = "ManagementPackTypeProjection",
    String = "String",
}

export interface IsNew {
    Name:          string;
    DisplayName:   string;
    Value:         boolean;
    ValueAsBigInt: string;
    Type:          string;
    AccessRights:  AccessRights;
    MaxLength:     number;
    IsDirty:       boolean;
}

export interface ConfigItemHasPrice {
    $Class$:         Class;
    $IsNew$:         IsNew;
    $Id$:            DisplayName;
    $DisplayName$:   DisplayName;
    $LastModified$:  DisplayName;
    $TimeAdded$:     DisplayName;
    Price1Amount?:   Price1Amount;
    $ComponentPath$: ComponentPath;
    DeploymentType?: Class;
}

export interface ComponentPath {
    Relationship:     string;
    TargetConstraint: null;
    SeedRole:         string;
}

export interface Price1Amount {
    Name:          string;
    DisplayName:   string;
    Value:         number;
    ValueAsBigInt: string;
    Type:          string;
    EnumName:      string;
    AccessRights:  AccessRights;
    MaxLength:     number;
    IsDirty:       boolean;
}
