import CryptoJS from 'crypto-js';

var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

var rule = {
    title: '金牌影院',
    host: 'https://www.cfkj86.com',
    url: '/api/mw-movie/anonymous/video/list?pageNum=fypage&pageSize=30&sort=1&sortBy=1&type1=fyclass',
    class_name: '电影&电视剧&综艺&动漫',
    class_url: '1&2&3&4',
    searchUrl: '',
    searchable: 1,
    quickSearch: 1,
    filterable: 1,
    headers: {
        'User-Agent': UA
    },
    timeout: 5000,
    init: function(cfg) {
        Object.assign(rule, cfg);
        return JSON.stringify({
            class: [
                { type_id: 1, type_name: '电影' },
                { type_id: 2, type_name: '电视剧' },
                { type_id: 3, type_name: '综艺' },
                { type_id: 4, type_name: '动漫' }
            ]
        });
    },
    home: function(filter) {
        return JSON.stringify({
            class: [
                { type_id: 1, type_name: '电影' },
                { type_id: 2, type_name: '电视剧' },
                { type_id: 3, type_name: '综艺' },
                { type_id: 4, type_name: '动漫' }
            ]
        });
    },
    category: function(tid, pg, filter, extend) {
        const path = rule.url.replace('fyclass', tid).replace('fypage', pg);
        const url = rule.host + path;
        const headers = getHeader(url);
        const response = request(url, { headers });
        const data = JSON.parse(response.content).data;
        
        let videos = [];
        for (const item of data.list) {
            if (item.vodName.includes('预告')) continue;
            videos.push({
                vod_id: item.vodId.toString(),
                vod_name: item.vodName,
                vod_pic: item.vodPic,
                vod_remarks: item.vodRemarks || item.vodVersion || '',
            });
        }
        return JSON.stringify({
            page: parseInt(pg),
            pagecount: Math.ceil(data.total / 30),
            limit: 30,
            total: data.total,
            list: videos,
        });
    },
    detail: function(id) {
        const path = '/api/mw-movie/anonymous/video/detail?id=' + id;
        const url = rule.host + path;
        const headers = getHeader(url);
        const response = request(url, { headers });
        const data = JSON.parse(response.content).data;
        
        let vod = {
            vod_id: data.vodId,
            vod_name: data.vodName,
            vod_pic: data.vodPic,
            type_name: data.typeName,
            vod_year: data.vodYear,
            vod_area: data.vodArea,
            vod_remarks: data.vodRemarks,
            vod_actor: data.vodActor,
            vod_director: data.vodDirector,
            vod_content: data.vodContent,
            vod_play_from: "播放源",
            vod_play_url: data.episodeList.map(item => item.name + "$" + data.vodId + "_" + item.nid).join("#"),
        }
        
        return JSON.stringify({
            list: [vod]
        });
    },
    play: function(flag, id, flags) {
        const [vodId, nid] = id.split('_')
        const path = `/api/mw-movie/anonymous/v1/video/episode/url?id=${vodId}&nid=${nid}`;
        const url = rule.host + path;
        const headers = getHeader(url);
        const response = request(url, { headers });
        const data = JSON.parse(response.content);
        
        return JSON.stringify({
            parse: 0,
            url: data.data.playUrl,
            header: {
                'User-Agent': headers['User-Agent'],
                Referer: url,
            }
        });
    },
    search: function(key) {
        const page = 1
        const path = `/api/mw-movie/anonymous/video/searchByWordPageable?keyword=${encodeURIComponent(key)}&pageNum=${page}&pageSize=12&type=false`
        const url = rule.host + path
        const signStr = `searchByWordPageable?keyword=${key}&pageNum=${page}&pageSize=12&type=false`
        const headers = getHeader(signStr)

        const response = request(url, { headers });
        console.log('服务器返回数据:', response.content);
        const data = JSON.parse(response.content).data;

        let videos = []
        for (const item of data.list) {
            if (item.vodName.includes('预告')) continue
            videos.push({
                vod_id: item.vodId.toString(),
                vod_name: item.vodName,
                vod_pic: item.vodPic,
                vod_remarks: item.vodRemarks || item.vodVersion || '',
            })
        }
        return JSON.stringify({
            list: videos
        })
    }
};

function getHeader(url) {
    const signKey = 'cb808529bae6b6be45ecfab29a4889bc'
    const dataStr = url.split('?')[1]
    const t = Date.now()
    const signStr = dataStr + `&key=${signKey}` + `&t=${t}`

    function getUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (e) => ('x' === e ? (16 * Math.random()) | 0 : 'r&0x3' | '0x8').toString(16))
    }

    const headers = {
        'User-Agent': UA,
        deviceId: getUUID(),
        t: t.toString(),
        sign: CryptoJS.SHA1(CryptoJS.MD5(signStr).toString()).toString(),
    }

    return headers
}

function request(url, options) {
    const response = fetch(url, {
        method: 'GET',
        headers: options.headers
    });
    const text = response.text();
    return { content: text };
}

function test() {
    console.log('========== 测试搜索接口 ==========');
    console.log('搜索关键词: 西游记');
    const searchResult = rule.search('西游记');
    const searchData = JSON.parse(searchResult);
    console.log('请求URL:', `${rule.host}/api/mw-movie/anonymous/video/searchByWordPageable?keyword=西游记&pageNum=1&pageSize=12&type=false`);
    console.log('搜索结果数量:', searchData.list.length);
    console.log('第一条结果:', JSON.stringify(searchData.list[0], null, 2));

    if (searchData.list && searchData.list.length > 0) {
        const firstItem = searchData.list[0];
        console.log('\n========== 测试详情接口 ==========');
        console.log('获取详情ID:', firstItem.vod_id);
        const detailResult = rule.detail(firstItem.vod_id);
        const detailData = JSON.parse(detailResult);
        console.log('请求URL:', `${rule.host}/api/mw-movie/anonymous/video/detail?id=${firstItem.vod_id}`);
        if (detailData.list && detailData.list.length > 0) {
            const vod = detailData.list[0];
            console.log('详情信息:', JSON.stringify({
                名称: vod.vod_name,
                年份: vod.vod_year,
                地区: vod.vod_area,
                导演: vod.vod_director,
                主演: vod.vod_actor,
                集数: vod.vod_remarks,
                剧情: vod.vod_content
            }, null, 2));

            if (vod.vod_play_url) {
                const episodes = vod.vod_play_url.split('#');
                if (episodes.length > 0) {
                    const firstEpisode = episodes[0].split('$')[1];
                    console.log('\n========== 测试播放接口 ==========');
                    console.log('播放ID:', firstEpisode);
                    const playResult = rule.play(null, firstEpisode);
                    const playData = JSON.parse(playResult);
                    console.log('请求URL:', `${rule.host}/api/mw-movie/anonymous/v1/video/episode/url?id=${firstItem.vod_id}&nid=${firstEpisode.split('_')[1]}`);
                    console.log('播放信息:', JSON.stringify(playData, null, 2));
                }
            }
        }
    }

    console.log('\n========== 测试分类接口 ==========');
    console.log('分类参数: type=1(电影), page=1');
    const categoryResult = rule.category('1', '1');
    const categoryData = JSON.parse(categoryResult);
    console.log('请求URL:', `${rule.host}/api/mw-movie/anonymous/video/getListByType?typeId=1&pageNum=1&pageSize=30`);
    console.log('分类结果数量:', categoryData.list.length);
    console.log('第一条结果:', JSON.stringify(categoryData.list[0], null, 2));
}
