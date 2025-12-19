/**
 * Base Value Object class
 * Value objects are compared by value, not identity
 * All properties should be readonly để ensure immutability
 */
export abstract class BaseValueObject {
  /**
   * Value objects are compared by value, not identity
   */
  equals(other: BaseValueObject): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    if (this.constructor !== other.constructor) {
      return false;
    }
    return this.getEqualityComponents().every(
      (component, index) => component === other.getEqualityComponents()[index],
    );
  }

  /**
   * Subclasses must implement this to define equality components
   */
  protected abstract getEqualityComponents(): unknown[];

  toString(): string {
    return `${this.constructor.name}(${this.getEqualityComponents().join(', ')})`;
  }
}
