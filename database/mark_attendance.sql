-- mark_attendance RPC: safe server-side function to mark attendance
-- Usage: SELECT * FROM mark_attendance('ROLL_NUMBER')
-- This version accepts either the plain roll number or a QR payload like 'ROLL|timestamp'.

CREATE OR REPLACE FUNCTION mark_attendance(qr_payload text)
RETURNS TABLE(id VARCHAR, student_id INTEGER, status TEXT) AS $$
DECLARE
  _student_id INTEGER;
  _id TEXT := 'att-' || floor(EXTRACT(EPOCH FROM now()))::text || '-' || substring(md5(random()::text),1,8);
  _roll text := qr_payload;
BEGIN
  -- If payload contains a pipe, assume format "roll|ts" and extract roll
  IF position('|' IN qr_payload) > 0 THEN
    _roll := split_part(qr_payload, '|', 1);
  END IF;

  SELECT s.id INTO _student_id
  FROM students s
  WHERE s.roll_number = _roll
  LIMIT 1;

  IF _student_id IS NULL THEN
    RAISE EXCEPTION 'student_not_found';
  END IF;

  INSERT INTO attendance(id, student_id, date, status, scan_time, finalized, created_at, updated_at)
    VALUES(_id, _student_id, CURRENT_DATE, 'present', now(), FALSE, now(), now());

  RETURN QUERY SELECT _id, _student_id, 'present';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
