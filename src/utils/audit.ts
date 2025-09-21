// Polkadot Password Manager
// Comprehensive audit logging system for security monitoring

import { createLogger } from './logger';
import { SecurityEventType, SecurityRiskLevel } from '../config/security';
import { createSecureHash } from './encryption';

const logger = createLogger('audit');

export interface AuditEvent {
  id: string;
  timestamp: number;
  eventType: SecurityEventType;
  riskLevel: SecurityRiskLevel;
  userId?: string | undefined;
  sessionId?: string | undefined;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  requestId?: string | undefined;
  details: Record<string, any>;
  metadata: {
    version: string;
    environment: string;
    service: string;
  };
}

export interface AuditContext {
  userId?: string | undefined;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  additionalData?: Record<string, any>;
}

class AuditLogger {
  private sensitiveFields: Set<string>;
  // private maxLogSize: number;

  constructor() {
    this.sensitiveFields = new Set([
      'password',
      'token',
      'secret',
      'key',
      'private',
      'auth',
      'credential',
      'signature',
      'nonce'
    ]);
    // this.maxLogSize = 1000000; // 1MB
  }

  /**
   * Log a security event
   */
  logEvent(
    eventType: SecurityEventType,
    riskLevel: SecurityRiskLevel,
    details: Record<string, any>,
    context?: AuditContext
  ): void {
    try {
      const event: AuditEvent = {
        id: this.generateEventId(),
        timestamp: Date.now(),
        eventType,
        riskLevel,
        userId: context?.userId || undefined,
        sessionId: context?.sessionId || undefined,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        requestId: context?.requestId,
        details: this.sanitizeData(details),
        metadata: {
          version: process.env['npm_package_version'] || '1.0.0',
          environment: process.env['NODE_ENV'] || 'development',
          service: 'polkadot-password-manager'
        }
      };

      // Log based on risk level
      this.logByRiskLevel(event);

      // Additional processing for high-risk events
      if (riskLevel === SecurityRiskLevel.HIGH || riskLevel === SecurityRiskLevel.CRITICAL) {
        this.handleHighRiskEvent(event);
      }

    } catch (error) {
      logger.error('Failed to log audit event', { error, eventType, riskLevel });
    }
  }

  /**
   * Log authentication success
   */
  logAuthenticationSuccess(
    userId: string,
    method: string,
    context?: AuditContext
  ): void {
    this.logEvent(
      SecurityEventType.AUTHENTICATION_SUCCESS,
      SecurityRiskLevel.LOW,
      {
        method,
        timestamp: Date.now()
      },
      { ...context, userId }
    );
  }

  /**
   * Log authentication failure
   */
  logAuthenticationFailure(
    reason: string,
    method: string,
    context?: AuditContext
  ): void {
    this.logEvent(
      SecurityEventType.AUTHENTICATION_FAILURE,
      SecurityRiskLevel.MEDIUM,
      {
        reason,
        method,
        timestamp: Date.now()
      },
      context
    );
  }

  /**
   * Log credential access
   */
  logCredentialAccess(
    credentialId: string,
    action: 'created' | 'accessed' | 'modified' | 'deleted',
    userId: string,
    context?: AuditContext
  ): void {
    const eventType = `credential_${action}` as SecurityEventType;
    const riskLevel = action === 'deleted' ? SecurityRiskLevel.MEDIUM : SecurityRiskLevel.LOW;

    this.logEvent(
      eventType,
      riskLevel,
      {
        credentialId,
        action,
        timestamp: Date.now()
      },
      { ...context, userId }
    );
  }

  /**
   * Log suspicious activity
   */
  logSuspiciousActivity(
    activity: string,
    details: Record<string, any>,
    context?: AuditContext
  ): void {
    this.logEvent(
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      SecurityRiskLevel.HIGH,
      {
        activity,
        ...details,
        timestamp: Date.now()
      },
      context
    );
  }

  /**
   * Log security violation
   */
  logSecurityViolation(
    violation: string,
    details: Record<string, any>,
    context?: AuditContext
  ): void {
    this.logEvent(
      SecurityEventType.SECURITY_VIOLATION,
      SecurityRiskLevel.CRITICAL,
      {
        violation,
        ...details,
        timestamp: Date.now()
      },
      context
    );
  }

  /**
   * Log rate limit exceeded
   */
  logRateLimitExceeded(
    endpoint: string,
    limit: number,
    context?: AuditContext
  ): void {
    this.logEvent(
      SecurityEventType.RATE_LIMIT_EXCEEDED,
      SecurityRiskLevel.MEDIUM,
      {
        endpoint,
        limit,
        timestamp: Date.now()
      },
      context
    );
  }

  /**
   * Log session events
   */
  logSessionEvent(
    action: 'created' | 'destroyed' | 'refreshed',
    sessionId: string,
    userId?: string,
    context?: AuditContext
  ): void {
    const eventType = action === 'created' ? SecurityEventType.SESSION_CREATED : 
                     action === 'destroyed' ? SecurityEventType.SESSION_DESTROYED : 
                     SecurityEventType.SESSION_CREATED; // Use created for refresh

    this.logEvent(
      eventType,
      SecurityRiskLevel.LOW,
      {
        action,
        sessionId,
        timestamp: Date.now()
      },
      { ...context, sessionId, userId: userId }
    );
  }

  /**
   * Log system errors
   */
  logSystemError(
    error: Error,
    context?: AuditContext
  ): void {
    this.logEvent(
      SecurityEventType.SYSTEM_ERROR,
      SecurityRiskLevel.HIGH,
      {
        error: error.message,
        stack: error.stack,
        timestamp: Date.now()
      },
      context
    );
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    return createSecureHash(timestamp + random).substring(0, 16);
  }

  /**
   * Sanitize data to remove sensitive information
   */
  private sanitizeData(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      
      if (this.sensitiveFields.has(lowerKey)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Log based on risk level
   */
  private logByRiskLevel(event: AuditEvent): void {
    const logData = {
      eventId: event.id,
      eventType: event.eventType,
      riskLevel: event.riskLevel,
      userId: event.userId,
      sessionId: event.sessionId,
      ipAddress: event.ipAddress,
      timestamp: event.timestamp,
      details: event.details
    };

    switch (event.riskLevel) {
      case SecurityRiskLevel.CRITICAL:
        logger.error('CRITICAL security event', logData);
        break;
      case SecurityRiskLevel.HIGH:
        logger.error('HIGH security event', logData);
        break;
      case SecurityRiskLevel.MEDIUM:
        logger.warn('MEDIUM security event', logData);
        break;
      case SecurityRiskLevel.LOW:
        logger.info('LOW security event', logData);
        break;
    }
  }

  /**
   * Handle high-risk events with additional processing
   */
  private handleHighRiskEvent(event: AuditEvent): void {
    // In a production system, you might:
    // - Send alerts to security team
    // - Trigger additional monitoring
    // - Block suspicious IPs
    // - Require additional authentication
    
    logger.error('High-risk security event detected', {
      eventId: event.id,
      eventType: event.eventType,
      riskLevel: event.riskLevel,
      ipAddress: event.ipAddress,
      userId: event.userId,
      details: event.details
    });
  }

  /**
   * Get audit trail for a user
   */
  async getAuditTrail(
    _userId: string,
    _startDate?: Date,
    _endDate?: Date,
    _eventTypes?: SecurityEventType[]
  ): Promise<AuditEvent[]> {
    // In a real implementation, this would query your audit database
    // For now, return empty array
    return [];
  }

  /**
   * Get security metrics
   */
  async getSecurityMetrics(
    _startDate: Date,
    _endDate: Date
  ): Promise<Record<string, any>> {
    // In a real implementation, this would aggregate audit data
    return {
      totalEvents: 0,
      criticalEvents: 0,
      highRiskEvents: 0,
      mediumRiskEvents: 0,
      lowRiskEvents: 0,
      uniqueUsers: 0,
      uniqueIPs: 0
    };
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();

// Export convenience functions
export const logAuthSuccess = auditLogger.logAuthenticationSuccess.bind(auditLogger);
export const logAuthFailure = auditLogger.logAuthenticationFailure.bind(auditLogger);
export const logCredentialAccess = auditLogger.logCredentialAccess.bind(auditLogger);
export const logSuspiciousActivity = auditLogger.logSuspiciousActivity.bind(auditLogger);
export const logSecurityViolation = auditLogger.logSecurityViolation.bind(auditLogger);
export const logRateLimitExceeded = auditLogger.logRateLimitExceeded.bind(auditLogger);
export const logSessionEvent = auditLogger.logSessionEvent.bind(auditLogger);
export const logSystemError = auditLogger.logSystemError.bind(auditLogger);
