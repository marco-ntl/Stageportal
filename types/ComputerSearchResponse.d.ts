//Généré automatiquement via https://app.quicktype.io/?l=ts
export interface ComputerSearchResponse {
    Count:       number;
    Items:       Item[];
    DebugOutput: null;
}

export interface Item {
    $Class$:                               Class;
    $IsNew$:                               IsNew;
    $Id$:                                  DisplayName;
    $DisplayName$:                         DisplayName;
    $LastModified$:                        DisplayName;
    $TimeAdded$:                           DisplayName;
    Status:                                DisplayName;
    SerialNumber:                          DisplayName;
    Region:                                DisplayName;
    Platform:                              DisplayName;
    DeviceDescription:                     DisplayName;
    DisplayName:                           DisplayName;
    $TypeProjection$:                      DisplayName;
    HardwareAssetIsBasedOnCatalogItem:     HardwareAsset;
    HardwareAssetIsAssignedToLocation:     null;
    HardwareAssetIsAssignedToOrganization: HardwareAsset;
    HardwareAssetIsAssignedToCostCenter:   null;
    HardwareAssetHasConfigurationItem:     HardwareAsset;
    HardwareAssetIsUsedByPerson:           HardwareAsset | null;
}

export interface Class {
    Name:          ClassName;
    Id:            string;
    DisplayName:   DisplayNameEnum;
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

export enum DisplayNameEnum {
    HardwareAsset = "Hardware Asset",
    HardwareCatalogItem = "Hardware Catalog Item",
    OrdinateurWindows = "Ordinateur Windows",
    Organization = "Organization",
    Person = "Person",
}

export enum ClassName {
    ItnetXAssetManagementHardwareAsset = "itnetX.AssetManagement.HardwareAsset",
    ItnetXAssetManagementHardwareCatalogItem = "itnetX.AssetManagement.HardwareCatalogItem",
    ItnetXAssetManagementOrganization = "itnetX.AssetManagement.Organization",
    ItnetXAssetManagementPerson = "itnetX.AssetManagement.Person",
    MicrosoftWindowsComputer = "Microsoft.Windows.Computer",
}

export enum ClassType {
    DateTime = "DateTime",
    Enum = "Enum",
    GUID = "Guid",
    ManagementPackClass = "ManagementPackClass",
    ManagementPackTypeProjection = "ManagementPackTypeProjection",
    String = "String",
}

export interface DisplayName {
    Name:          DisplayNameName;
    Value:         string;
    ValueAsBigInt: string;
    Type:          ClassType;
    AccessRights:  AccessRights;
    MaxLength:     number;
    IsDirty:       boolean;
    Id?:           string;
    DisplayName?:  string;
    EnumName?:     EnumName;
    Description?:  Description;
    EnumTypeId?:   string;
    EnumId?:       string;
}

export enum Description {
    HardwareCatalogItemItnetXAssetManagement = "Hardware Catalog Item (itnetX Asset Management)",
    NomCompletDeLObjet = "Nom complet de l'objet.",
    OrganizationItnetXAssetManagement = "Organization (itnetX Asset Management)",
    PersonItnetXAssetManagement = "Person (itnetX Asset Management)",
}

export enum EnumName {
    Empty = "",
    ItnetXAssetManagementHardwareAssetStatusEnumDeployed = "itnetXAssetManagementHardwareAssetStatusEnum.Deployed",
    ItnetXAssetManagementHardwareAssetStatusEnumInRepair = "itnetXAssetManagementHardwareAssetStatusEnum.InRepair",
    SRGEnumPlatformWindows = "SRG.Enum.Platform.Windows",
    SRGEnumRegionRTS = "SRG.Enum.Region.RTS",
}

export enum DisplayNameName {
    DeviceDescription = "DeviceDescription",
    DisplayName = "$DisplayName$",
    ID = "$Id$",
    ItnetXAssetManagementHardwareAssetViewTypeProjection = "itnetX.AssetManagement.HardwareAsset.View.TypeProjection",
    ItnetXAssetManagementHardwareCatalogItem = "itnetX.AssetManagement.HardwareCatalogItem",
    ItnetXAssetManagementOrganization = "itnetX.AssetManagement.Organization",
    ItnetXAssetManagementPerson = "itnetX.AssetManagement.Person",
    LastModified = "$LastModified$",
    NameDisplayName = "DisplayName",
    Platform = "Platform",
    Region = "Region",
    SerialNumber = "SerialNumber",
    Status = "Status",
    TimeAdded = "$TimeAdded$",
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

export interface HardwareAsset {
    $Class$:         Class;
    $IsNew$:         IsNew;
    $Id$:            DisplayName;
    $DisplayName$:   DisplayName;
    $LastModified$:  DisplayName;
    $TimeAdded$:     DisplayName;
    $ComponentPath$: ComponentPath;
}

export interface ComponentPath {
    Relationship:     string;
    TargetConstraint: null;
    SeedRole:         SeedRole;
}

export enum SeedRole {
    Source = "Source",
}
