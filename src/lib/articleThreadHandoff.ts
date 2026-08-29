/**
 * Clé sessionStorage partagée : relais du fil de conversation de l'assistant IA
 * (EmbedAsk) pendant la visite d'un article inline (BlogArticleTemplate).
 * EmbedAsk dépose le fil + un résumé (hasMap / moreRemaining) avant navigation ;
 * l'article lit le résumé pour afficher les CTA de fin d'article, puis le fil
 * est restauré au retour (postArticle=map|more|new rejoue l'action côté EmbedAsk).
 */
export const ARTICLE_THREAD_HANDOFF_KEY = "owm-ai-article-thread-handoff";
