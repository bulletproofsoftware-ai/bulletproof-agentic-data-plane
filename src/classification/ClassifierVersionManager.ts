import { createLogger } from '../shared/logger.js';
import type { Classifier } from './types.js';

const logger = createLogger('classification:version-manager');

/**
 * Classifier Version Manager (REQ-035).
 * Hot-reload classifiers without system restart.
 * Tracks versions for audit trail.
 */
export class ClassifierVersionManager {
  private classifiers = new Map<string, Classifier>();
  private versions = new Map<string, string>();

  /**
   * Register a classifier.
   */
  register(classifier: Classifier): void {
    this.classifiers.set(classifier.classifierId, classifier);
    this.versions.set(classifier.classifierId, classifier.version);
    logger.info('Classifier registered', {
      classifierId: classifier.classifierId,
      version: classifier.version,
    });
  }

  /**
   * Get a classifier by ID.
   */
  get(classifierId: string): Classifier | undefined {
    return this.classifiers.get(classifierId);
  }

  /**
   * Get all registered classifiers.
   */
  getAll(): Classifier[] {
    return Array.from(this.classifiers.values());
  }

  /**
   * Hot-reload a classifier (replace with new version).
   */
  reload(classifier: Classifier): void {
    const oldVersion = this.versions.get(classifier.classifierId);
    this.classifiers.set(classifier.classifierId, classifier);
    this.versions.set(classifier.classifierId, classifier.version);
    logger.info('Classifier hot-reloaded', {
      classifierId: classifier.classifierId,
      oldVersion,
      newVersion: classifier.version,
    });
  }

  /**
   * Get the current version of a classifier.
   */
  getVersion(classifierId: string): string {
    return this.versions.get(classifierId) ?? 'unknown';
  }

  /**
   * List all classifier IDs and versions.
   */
  listVersions(): Array<{ classifierId: string; version: string }> {
    return Array.from(this.versions.entries()).map(([id, version]) => ({
      classifierId: id,
      version,
    }));
  }
}
