-- Migration 024: Task Attachments
-- Stores file attachment metadata for task descriptions, input specs, and output specs.
-- File bytes live in Supabase Storage (task-attachments bucket); this table tracks metadata.

CREATE TABLE task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  field TEXT NOT NULL CHECK (field IN ('description', 'input_spec', 'output_spec')),
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size > 0),
  content_type TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_task_attachments_task_id ON task_attachments(task_id);

ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- Read: owner can always see their attachments; others can see for non-draft tasks
CREATE POLICY "attachments_read" ON task_attachments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tasks WHERE tasks.id = task_id AND (
      tasks.company_id = auth.uid()
      OR tasks.status != 'draft'
    )
  )
);

-- Write: only task owner can insert
CREATE POLICY "attachments_write" ON task_attachments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_id AND tasks.company_id = auth.uid()));

-- Delete: only task owner can delete
CREATE POLICY "attachments_delete" ON task_attachments FOR DELETE
  USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_id AND tasks.company_id = auth.uid()));
