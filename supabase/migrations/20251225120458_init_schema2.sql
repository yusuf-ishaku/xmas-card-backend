-- Make recipient_last_name nullable in messages
ALTER TABLE public.messages
ALTER COLUMN recipient_last_name DROP NOT NULL;

-- Make opener names nullable in opens
ALTER TABLE public.opens
ALTER COLUMN opener_first_name DROP NOT NULL,
ALTER COLUMN opener_last_name DROP NOT NULL;

-- Make downloader names nullable in downloads
ALTER TABLE public.downloads
ALTER COLUMN downloader_first_name DROP NOT NULL,
ALTER COLUMN downloader_last_name DROP NOT NULL;

-- Make replier names nullable in replies
ALTER TABLE public.replies
ALTER COLUMN replier_first_name DROP NOT NULL,
ALTER COLUMN replier_last_name DROP NOT NULL;
