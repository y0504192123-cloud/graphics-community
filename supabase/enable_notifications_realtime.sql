-- Enable realtime for the notifications table.
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
