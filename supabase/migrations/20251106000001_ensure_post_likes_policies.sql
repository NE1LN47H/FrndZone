-- Ensure post_likes RLS policies exist (idempotent)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'post_likes' 
      AND policyname = 'Post likes are viewable by everyone'
  ) THEN
    CREATE POLICY "Post likes are viewable by everyone"
      ON public.post_likes FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'post_likes' 
      AND policyname = 'Users can like posts'
  ) THEN
    CREATE POLICY "Users can like posts"
      ON public.post_likes FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'post_likes' 
      AND policyname = 'Users can unlike own likes'
  ) THEN
    CREATE POLICY "Users can unlike own likes"
      ON public.post_likes FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;
