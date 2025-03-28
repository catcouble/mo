var rule = {
    title: 'KIMIVOD',
    host: 'https://kimivod.com',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    // URL验证
    url: '/vod/show/id/fyclass/page/fypage.html',
    searchUrl: '/search.php?searchword=**',
    searchable: 1,
    quickSearch: 1,
    filterable: 1,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
    }
};

function init(ext) {
    log('init with ext:' + ext);
}

function homeContent(filter) {
    let classes = [
        { type_id: 1, type_name: "电视剧" },
        { type_id: 2, type_name: "电影" },
        { type_id: 3, type_name: "动漫" },
        { type_id: 4, type_name: "综艺" },
        { type_id: 39, type_name: "短剧" }
    ];
    
    let videos = [];
    try {
        const url = rule.host + '/index.php/ajax/data.html';
        const params = {
            mid: 1,
            tid: 1,
            page: 1,
            limit: 24
        };
        
        const headers = {
            'User-Agent': rule.ua,
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest'
        };

        log('开始获取首页数据');
        const resp = request(url, {
            method: 'post',
            headers: headers,
            data: params,
            postType: 'form'
        });
        log('获取首页数据成功: ' + resp);

        const data = JSON.parse(resp);
        data.list.forEach(item => {
            videos.push({
                vod_id: item.vod_id,
                vod_name: item.vod_name,
                vod_pic: item.vod_pic,
                vod_remarks: item.vod_remarks
            });
        });
    } catch (e) {
        log('首页数据获取失败:' + e.message);
    }

    return JSON.stringify({
        class: classes,
        list: videos,
        filters: {}
    });
}

function categoryContent(tid, pg, filter, extend) {
    let videos = [];
    try {
        const url = rule.host + '/index.php/ajax/data.html';
        const params = {
            mid: 1,
            tid: parseInt(tid),
            page: parseInt(pg),
            limit: 24
        };
        
        const headers = {
            'User-Agent': rule.ua,
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest'
        };

        log('开始获取分类数据');
        const resp = request(url, {
            method: 'post',
            headers: headers,
            data: params,
            postType: 'form'
        });
        log('获取分类数据成功: ' + resp);

        const data = JSON.parse(resp);
        data.list.forEach(item => {
            videos.push({
                vod_id: item.vod_id,
                vod_name: item.vod_name,
                vod_pic: item.vod_pic,
                vod_remarks: item.vod_remarks,
                vod_year: item.vod_year,
                vod_area: item.vod_area,
                vod_actor: item.vod_actor,
                vod_director: item.vod_director,
                vod_content: item.vod_content
            });
        });

        return JSON.stringify({
            page: parseInt(pg),
            pagecount: Math.ceil(data.total / 24),
            limit: 24,
            total: data.total,
            list: videos
        });
    } catch (e) {
        log('分类数据获取失败:' + e.message);
        return JSON.stringify({
            page: parseInt(pg),
            pagecount: 0,
            limit: 24,
            total: 0,
            list: []
        });
    }
}

function detailContent(ids) {
    try {
        const url = rule.host + '/vod/detail/id/' + ids[0] + '.html';
        const headers = {
            'User-Agent': rule.ua
        };

        log('开始获取详情页');
        const html = request(url, {
            headers: headers
        });
        log('获取详情页成功');
        
        const $ = load(html);
        const vod = {
            vod_id: ids[0],
            vod_name: $('.title').text().trim(),
            vod_pic: $('.pic img').attr('data-original'),
            vod_remarks: $('.pic-text').text().trim(),
            vod_content: $('.detail-content').text().trim()
        };

        const playLists = [];
        $('.playno').each((list) => {
            const title = $('.tabs a.active span.max').text().trim();
            const episodes = [];
            
            $(list).find('a').each((item) => {
                episodes.push(
                    $(item).text().trim() + '$' + $(item).attr('href')
                );
            });

            if (episodes.length > 0) {
                playLists.push(title + '$$$' + episodes.join('#'));
            }
        });

        vod.vod_play_from = playLists.map((_, i) => '播放列表' + (i + 1)).join('$$$');
        vod.vod_play_url = playLists.join('$$$');

        return JSON.stringify({
            list: [vod]
        });
    } catch (e) {
        log('详情页获取失败:' + e.message);
        return JSON.stringify({
            list: []
        });
    }
}

function searchContent(key, quick) {
    let videos = [];
    try {
        const url = rule.host + '/search.php?searchword=' + encodeURIComponent(key);
        const headers = {
            'User-Agent': rule.ua
        };

        log('开始搜索:' + key);
        const html = request(url, {
            headers: headers
        });
        log('搜索页面获取成功');
        
        const $ = load(html);
        
        $('.myui-vodlist__media li').each((item) => {
            const $link = $(item).find('.title a');
            const $img = $(item).find('.myui-vodlist__thumb');
            const $remark = $(item).find('.pic-text');
            
            if ($link) {
                const href = $link.attr('href') || '';
                const vod_id = href.split('/').filter(s => s).pop() || '';
                
                videos.push({
                    vod_id: vod_id,
                    vod_name: $link.text().trim(),
                    vod_pic: $img.attr('data-original') || '',
                    vod_remarks: $remark.text().trim()
                });
            }
        });

        log('搜索到' + videos.length + '个结果');
        return JSON.stringify({
            list: videos
        });
    } catch (e) {
        log('搜索失败:' + e.message);
        return JSON.stringify({
            list: []
        });
    }
}

function playerContent(flag, id, flags) {
    try {
        log('开始获取播放信息:' + id);
        const html = request(id, {
            headers: {
                'User-Agent': rule.ua
            }
        });
        
        const $ = load(html);
        const script = $('script:contains("file:")').text();
        const match = script.match(/file:"([^"]+)"/);
        
        if (match && match[1]) {
            log('获取到播放地址:' + match[1]);
            return JSON.stringify({
                parse: 0,
                url: match[1]
            });
        }
        
        return JSON.stringify({
            parse: 0,
            url: ''
        });
    } catch (e) {
        log('播放信息获取失败:' + e.message);
        return JSON.stringify({
            parse: 0,
            url: ''
        });
    }
}

// 导出接口
export default {
    init: init,
    homeContent: homeContent,
    categoryContent: categoryContent,
    detailContent: detailContent,
    playerContent: playerContent,
    searchContent: searchContent
};
