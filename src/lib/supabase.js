// Supabase 클라이언트 설정
// src/lib/supabase.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bhsbwbeisqzgipvzpvym.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoc2J3YmVpc3F6Z2lwdnpwdnltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTAwNjAzOSwiZXhwIjoyMDc2NTgyMDM5fQ.ej_88NKqxygv8-Ne42irzHZgxbOqFyATx2e6t34tMA8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 룩북 이미지 업로드
export async function uploadLookbookImage(file, fileName) {
    const { data, error } = await supabase.storage
        .from('lookbook-images')
        .upload(`uploads/${fileName}`, file, {
            cacheControl: '3600',
            upsert: true
        });

    if (error) {
        console.error('이미지 업로드 실패:', error);
        throw error;
    }

    // 공개 URL 반환
    const { data: urlData } = supabase.storage
        .from('lookbook-images')
        .getPublicUrl(`uploads/${fileName}`);

    return urlData.publicUrl;
}

// 룩북 데이터 저장
export async function saveLookbookEntry(entry) {
    const { data, error } = await supabase
        .from('lookbook_entries')
        .insert([entry])
        .select();

    if (error) {
        console.error('룩북 저장 실패:', error);
        throw error;
    }

    return data[0];
}

// 룩북 데이터 조회
export async function getLookbookEntries(limit = 20) {
    const { data, error } = await supabase
        .from('lookbook_entries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('룩북 조회 실패:', error);
        throw error;
    }

    return data;
}

// 특정 룩북 조회
export async function getLookbookEntry(id) {
    const { data, error } = await supabase
        .from('lookbook_entries')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('룩북 조회 실패:', error);
        throw error;
    }

    return data;
}

// 룩북 삭제
export async function deleteLookbookEntry(id) {
    const { error } = await supabase
        .from('lookbook_entries')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('룩북 삭제 실패:', error);
        throw error;
    }

    return true;
}

export default supabase;
