-- RLS policies for post_likes to support like lookups and toggles

-- Allow anyone to view likes (safe aggregate/read)
CREATE POLICY "Post likes are viewable by everyone"
  ON public.post_likes FOR SELECT
  USING (true);

-- Allow users to like posts as themselves
CREATE POLICY "Users can like posts"
  ON public.post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to unlike (delete) their own likes
CREATE POLICY "Users can unlike own likes"
  ON public.post_likes FOR DELETE
  USING (auth.uid() = user_id);
