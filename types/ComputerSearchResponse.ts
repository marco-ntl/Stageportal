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
    SerialNumber:                          DisplayName;
    Status:                                DisplayName;
    Region:                                DisplayName;
    Platform:                              DisplayName;
    DeviceType:                            BusinessType;
    DeviceDescription:                     BusinessType;
    BusinessType:                          BusinessType;
    DisplayName:                           BusinessType;
    $TypeProjection$:                      DisplayName;
    HardwareAssetIsBasedOnCatalogItem:     null;
    HardwareAssetIsAssignedToLocation:     null;
    HardwareAssetIsAssignedToOrganization: null;
    HardwareAssetIsAssignedToCostCenter:   null;
    HardwareAssetHasConfigurationItem:     null;
    HardwareAssetIsUsedByPerson:           HardwareAssetIsUsedByPerson;
    HardwareAssetIsUsedByOrganization:     any[];
    HardwareAssetBelongsToHardwareAsset:   any[];
    ContractIsAssignedToConfigItem:        any[];
    ImpactedWorkItem:                      any[];
    RelatedWorkItem:                       any[];
    FileAttachment:                        any[];
    RelatedConfigItem:                     any[];
    RelatedConfigItemSource:               any[];
    RelatedKnowledgeArticles:              any[];
    ConfigItemHasPrice:                    null;
}

export interface Class {
    Name:          string;
    Id:            string;
    DisplayName:   string;
    Description:   string;
    Value:         string;
    ValueAsBigInt: string;
    Type:          string;
    AccessRights:  AccessRights;
    MaxLength:     number;
    IsDirty:       boolean;
}

export enum AccessRights {
    Read = "Read",
    Unknown = "Unknown",
}

export interface DisplayName {
    Name:          string;
    Value:         string;
    ValueAsBigInt: string;
    Type:          string;
    AccessRights:  AccessRights;
    MaxLength:     number;
    IsDirty:       boolean;
    Id?:           string;
    DisplayName?:  string;
    EnumName?:     string;
    EnumTypeId?:   string;
    EnumId?:       string;
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

export interface BusinessType {
    Name:          string;
    DisplayName:   string;
    Value:         string;
    ValueAsBigInt: string;
    Type:          string;
    EnumTypeId?:   string;
    EnumId?:       string;
    EnumName:      string;
    AccessRights:  AccessRights;
    MaxLength:     number;
    IsDirty:       boolean;
    Description?:  string;
}

export interface HardwareAssetIsUsedByPerson {
    $Class$:           Class;
    $IsNew$:           IsNew;
    $Id$:              DisplayName;
    $DisplayName$:     DisplayName;
    $LastModified$:    DisplayName;
    $TimeAdded$:       DisplayName;
    UserPrincipalName: DisplayName;
    $ComponentPath$:   ComponentPath;
}

export interface ComponentPath {
    Relationship:     string;
    TargetConstraint: null;
    SeedRole:         string;
}
