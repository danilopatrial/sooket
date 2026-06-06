

interface Pattern {
    name: string;
    regex: string;
    score: number;
    flags?: string;
}
interface Match {
    entity: string;
    start: number;
    end: number;
    score: number;
    text: string;
    patternName: string;
}

declare abstract class PatternRecognizer {
    readonly entity: string;
    readonly patterns: Pattern[];
    readonly context: string[];
    constructor(entity: string, patterns: Pattern[], context?: string[]);
    analyze(text: string): Match[];
    protected validateResult(_text: string): boolean | null;
    protected invalidateResult(_text: string): boolean;
    static sanitizeValue(text: string, replacementPairs: [string, string][]): string;
    private removeDuplicates;
}

interface RedactOptions {
    minScore?: number;
    replacement?: string | ((match: Match) => string);
}
declare function createDefaultRecognizers(): PatternRecognizer[];
declare class PiiRedactor {
    private readonly recognizers;
    constructor(recognizers?: PatternRecognizer[]);
    analyze(text: string): Match[];
    redact(text: string, opts?: RedactOptions): string;
}

declare class EmailRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
    protected validateResult(text: string): boolean | null;
}

declare class CreditCardRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    private readonly replacementPairs;
    constructor(patterns?: Pattern[], context?: string[], replacementPairs?: [string, string][]);
    protected validateResult(text: string): boolean | null;
}

declare class IpRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
    protected invalidateResult(text: string): boolean;
}

declare class IbanRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    private readonly replacementPairs;
    constructor(patterns?: Pattern[], context?: string[], replacementPairs?: [string, string][]);
    analyze(text: string): Match[];
    protected validateResult(text: string): boolean | null;
}

declare class MacAddressRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
    protected invalidateResult(text: string): boolean;
}

declare class PhoneRecognizer extends PatternRecognizer {
    static readonly SCORE = 0.4;
    static readonly CONTEXT: string[];
    static readonly DEFAULT_SUPPORTED_REGIONS: string[];
    private readonly supportedRegions;
    constructor(context?: string[], supportedRegions?: string[]);
    analyze(text: string): Match[];
}

declare class CryptoRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
    protected validateResult(text: string): boolean | null;
}

declare class UrlRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
}

declare class DateRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
}

declare class UsSsnRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
    protected invalidateResult(text: string): boolean;
}

declare class UsLicenseRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
}

declare class AbaRoutingRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    private readonly replacementPairs;
    constructor(patterns?: Pattern[], context?: string[], replacementPairs?: [string, string][]);
    protected validateResult(text: string): boolean | null;
}

declare class UsBankRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
}

declare class UsItinRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
}

declare class UsPassportRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
}

declare class UsNpiRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    private readonly replacementPairs;
    constructor(patterns?: Pattern[], context?: string[], replacementPairs?: [string, string][]);
    protected validateResult(text: string): boolean | null;
    protected invalidateResult(text: string): boolean;
}

declare class UsMbiRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
}

declare class MedicalLicenseRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    private readonly replacementPairs;
    constructor(patterns?: Pattern[], context?: string[], replacementPairs?: [string, string][]);
    protected validateResult(text: string): boolean | null;
}

declare class NhsRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    private readonly replacementPairs;
    constructor(patterns?: Pattern[], context?: string[], replacementPairs?: [string, string][]);
    protected validateResult(text: string): boolean | null;
}

declare class UkNinoRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
}

declare class UkPostcodeRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
}

declare class UkDrivingLicenceRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
}

declare class UkPassportRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
}

declare class UkVehicleRegistrationRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    private readonly replacementPairs;
    constructor(patterns?: Pattern[], context?: string[], replacementPairs?: [string, string][]);
    protected validateResult(text: string): boolean | null;
}

declare class InAadhaarRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    private readonly replacementPairs;
    constructor(patterns?: Pattern[], context?: string[], replacementPairs?: [string, string][]);
    protected validateResult(text: string): boolean | null;
}

declare class InPanRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
}

declare class InVehicleRegistrationRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    private readonly replacementPairs;
    constructor(patterns?: Pattern[], context?: string[], replacementPairs?: [string, string][]);
    protected validateResult(text: string): boolean | null;
}

declare class AuMedicareRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    private readonly replacementPairs;
    constructor(patterns?: Pattern[], context?: string[], replacementPairs?: [string, string][]);
    protected validateResult(text: string): boolean | null;
}

declare class AuTfnRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    private readonly replacementPairs;
    constructor(patterns?: Pattern[], context?: string[], replacementPairs?: [string, string][]);
    protected validateResult(text: string): boolean | null;
}

declare class AuAbnRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    private readonly replacementPairs;
    constructor(patterns?: Pattern[], context?: string[], replacementPairs?: [string, string][]);
    protected validateResult(text: string): boolean | null;
}

declare class AuAcnRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    private readonly replacementPairs;
    constructor(patterns?: Pattern[], context?: string[], replacementPairs?: [string, string][]);
    protected validateResult(text: string): boolean | null;
}

declare class CaSinRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
    protected invalidateResult(text: string): boolean;
}

declare class DeBsnrRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
    protected validateResult(text: string): boolean | null;
}

declare class DeFuehrerscheinRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
}

declare class DeHandelsregisterRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
}

declare class DeHealthInsuranceRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
    protected validateResult(text: string): boolean | null;
}

declare class DeKfzRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
}

declare class DeLanrRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
    protected validateResult(text: string): boolean | null;
}

declare class DePassportRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
    protected validateResult(text: string): boolean | null;
}

declare class DeSocialSecurityRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
    protected validateResult(text: string): boolean | null;
}

declare class DeTaxIdRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
    protected validateResult(text: string): boolean | null;
}

declare class DeVatIdRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    private readonly strictChecksum;
    constructor(patterns?: Pattern[], context?: string[], strictChecksum?: boolean);
    protected validateResult(text: string): boolean | null;
}

declare class PlPeselRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
    protected validateResult(text: string): boolean | null;
}

declare class SgFinRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
}

declare class SgUenRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
    protected validateResult(text: string): boolean | null;
}

declare class KrRrnRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[], entity?: string);
    protected validateResult(text: string): boolean | null;
    protected computeRrnSum(rn: string): number;
    protected validateRrnChecksum(rrn: string): boolean;
}

declare class KrFrnRecognizer extends KrRrnRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
    protected validateResult(text: string): boolean | null;
    private validateFrnChecksum;
}

declare class KrBrnRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
    protected validateResult(text: string): boolean | null;
}

declare class KrDriverLicenseRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
    protected validateResult(text: string): boolean | null;
}

declare class KrPassportRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
}

declare class EsNieRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
    protected validateResult(text: string): boolean | null;
}

declare class EsNifRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
    protected validateResult(text: string): boolean | null;
}

declare class EsPassportRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
}

declare class SePersonnummerRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
    protected validateResult(text: string): boolean | null;
}

declare class SeOrganisationsnummerRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
    protected validateResult(text: string): boolean | null;
}

declare class ItFiscalCodeRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
    protected validateResult(text: string): boolean | null;
}

declare class ItVatCodeRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
    protected validateResult(text: string): boolean | null;
}

declare class ItPassportRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
}

declare class ItDriverLicenseRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
}

declare class ItIdentityCardRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
}

declare class NgNinRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
    protected validateResult(text: string): boolean | null;
}

declare class NgVehicleRegistrationRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
}

declare class FiPersonalIdentityCodeRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
    protected validateResult(text: string): boolean | null;
}

declare class TrNationalIdRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
    protected validateResult(text: string): boolean | null;
}

declare class TrLicensePlateRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
    protected validateResult(text: string): boolean | null;
}

declare class ThTninRecognizer extends PatternRecognizer {
    static readonly PATTERNS: Pattern[];
    static readonly CONTEXT: string[];
    constructor(patterns?: Pattern[], context?: string[]);
    protected validateResult(text: string): boolean | null;
}

export { AbaRoutingRecognizer, AuAbnRecognizer, AuAcnRecognizer, AuMedicareRecognizer, AuTfnRecognizer, CaSinRecognizer, CreditCardRecognizer, CryptoRecognizer, DateRecognizer, DeBsnrRecognizer, DeFuehrerscheinRecognizer, DeHandelsregisterRecognizer, DeHealthInsuranceRecognizer, DeKfzRecognizer, DeLanrRecognizer, DePassportRecognizer, DeSocialSecurityRecognizer, DeTaxIdRecognizer, DeVatIdRecognizer, EmailRecognizer, EsNieRecognizer, EsNifRecognizer, EsPassportRecognizer, FiPersonalIdentityCodeRecognizer, IbanRecognizer, InAadhaarRecognizer, InPanRecognizer, InVehicleRegistrationRecognizer, IpRecognizer, ItDriverLicenseRecognizer, ItFiscalCodeRecognizer, ItIdentityCardRecognizer, ItPassportRecognizer, ItVatCodeRecognizer, KrBrnRecognizer, KrDriverLicenseRecognizer, KrFrnRecognizer, KrPassportRecognizer, KrRrnRecognizer, MacAddressRecognizer, type Match, MedicalLicenseRecognizer, NgNinRecognizer, NgVehicleRegistrationRecognizer, NhsRecognizer, type Pattern, PatternRecognizer, PhoneRecognizer, PiiRedactor, PlPeselRecognizer, type RedactOptions, SeOrganisationsnummerRecognizer, SePersonnummerRecognizer, SgFinRecognizer, SgUenRecognizer, ThTninRecognizer, TrLicensePlateRecognizer, TrNationalIdRecognizer, UkDrivingLicenceRecognizer, UkNinoRecognizer, UkPassportRecognizer, UkPostcodeRecognizer, UkVehicleRegistrationRecognizer, UrlRecognizer, UsBankRecognizer, UsItinRecognizer, UsLicenseRecognizer, UsMbiRecognizer, UsNpiRecognizer, UsPassportRecognizer, UsSsnRecognizer, createDefaultRecognizers };
