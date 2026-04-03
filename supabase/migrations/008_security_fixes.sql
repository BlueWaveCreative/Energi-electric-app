-- Migration: 008_security_fixes.sql
-- Purpose: Security hardening from full review

-- 1. Remove permissive INSERT policy on schedule_audit_log
-- The SECURITY DEFINER trigger handles all inserts — no direct client inserts needed
DROP POLICY IF EXISTS "System can insert audit logs" ON schedule_audit_log;
