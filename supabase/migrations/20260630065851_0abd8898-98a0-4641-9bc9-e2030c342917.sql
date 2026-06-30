ALTER ROLE sandbox_exec NOBYPASSRLS;
REVOKE INSERT, UPDATE ON public.blog_posts FROM sandbox_exec;