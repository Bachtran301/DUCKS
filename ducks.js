const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');
const printLogo = require('./src/logo');

class DuckClient {
    constructor() {
        this.headers = {
            "accept": "application/json, text/plain, */*",
            "accept-encoding": "gzip, deflate, br, zstd",
            "accept-language": "en-US,en;q=0.9",
            "content-type": "application/json",
            "origin": "https://app.duckcoop.xyz",
            "referer": "https://app.duckcoop.xyz/",
            "sec-ch-ua": '"Google Chrome";v="116", "Not=A?Brand";v="8", "Chromium";v="116"',
            "sec-ch-ua-mobile": "?1",
            "sec-ch-ua-platform": '"Android"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "cross-site",
            "user-agent": "Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36"
        };        
    }

    log(msg, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        switch(type) {
            case 'success':
                console.log(`[${timestamp}] [*] ${msg}`.green);
                break;
            case 'custom':
                console.log(`[${timestamp}] [*] ${msg}`.magenta);
                break;        
            case 'error':
                console.log(`[${timestamp}] [!] ${msg}`.red);
                break;
            case 'warning':
                console.log(`[${timestamp}] [*] ${msg}`.yellow);
                break;
            default:
                console.log(`[${timestamp}] [*] ${msg}`.blue);
        }
    }

    async countdown(seconds) {
        for (let i = seconds; i >= 0; i--) {
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`===== Waiting ${i} seconds to continue the loop =====`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        this.log('', 'info');
    }

    async login(initData) {
        const url = "https://api.apiduck.xyz/auth/telegram-login";
        
        const parts = new URLSearchParams(initData);
        const user = JSON.parse(decodeURIComponent(parts.get('user')));
        const queryId = parts.get('query_id');
        const authDate = parts.get('auth_date');
        const hash = parts.get('hash');

        const payload = {
            query_id: queryId,
            user: user,
            auth_date: authDate,
            hash: hash,
            referral_code: "F3ZbT0L9dX"
        };

        try {
            const response = await axios.post(url, payload, { headers: this.headers });
            if (response.status === 200 && response.data.error_code === "OK") {
                return { 
                    success: true, 
                    token: response.data.data.token,
                    userData: response.data.data.user_info
                };
            } else {
                return { success: false, error: response.data.error_code };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getReward(token) {
        const url = "https://api.apiduck.xyz/reward/get";
        const headers = { 
            ...this.headers, 
            "authorization": `Bearer ${token}`
        };

        try {
            const response = await axios.get(url, { headers });
            if (response.status === 200 && response.data.error_code === "OK") {
                return { success: true, data: response.data.data };
            } else {
                return { success: false, error: response.data.error_code };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getCheckinStatus(token) {
        const url = "https://api.apiduck.xyz/checkin/get";
        const headers = { 
            ...this.headers, 
            "authorization": `Bearer ${token}`
        };

        try {
            const response = await axios.get(url, { headers });
            if (response.status === 200 && response.data.error_code === "OK") {
                return { success: true, data: response.data.data };
            } else {
                return { success: false, error: response.data.error_code };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async claimCheckin(token) {
        const url = "https://api.apiduck.xyz/checkin/claim";
        const headers = { 
            ...this.headers, 
            "authorization": `Bearer ${token}`
        };

        try {
            const response = await axios.post(url, {}, { headers });
            if (response.status === 200 && response.data.error_code === "OK") {
                return { success: true, data: response.data.data };
            } else {
                return { success: false, error: response.data.error_code };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getPartnerMissions(token) {
        const url = "https://api.apiduck.xyz/partner-mission/list";
        const headers = { 
            ...this.headers, 
            "authorization": `Bearer ${token}`
        };

        try {
            const response = await axios.get(url, { headers });
            if (response.status === 200 && response.data.error_code === "OK") {
                // Extract all pm_ids where airdrop_info is null
                const eligibleMissions = [];
                response.data.data.data.forEach(partner => {
                    partner.partner_missions.forEach(mission => {
                        if (mission.airdrop_info === null) {
                            eligibleMissions.push({
                                pm_id: mission.pm_id,
                                title: mission.title,
                                reward: mission.reward
                            });
                        }
                    });
                });
                return { success: true, missions: eligibleMissions };
            } else {
                return { success: false, error: response.data.error_code };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async claimPartnerMission(token, missionId) {
        const url = "https://api.apiduck.xyz/user-partner-mission/claim";
        const headers = { 
            ...this.headers, 
            "authorization": `Bearer ${token}`
        };
        const payload = {
            partner_mission_id: missionId
        };

        try {
            const response = await axios.post(url, payload, { headers });
            return { success: response.data.error_code === "OK" };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    askQuestion(query) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        return new Promise(resolve => rl.question(query, ans => {
            rl.close();
            resolve(ans);
        }))
    }

    async main() {
        const dataFile = path.join(__dirname, 'data.txt');
        const data = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);
        printLogo();

        const doMissions = await this.askQuestion('Do you want to complete missions? (y/n): ');
        const shouldDoMissions = doMissions.toLowerCase() === 'y';
        while (true) {
            for (let i = 0; i < data.length; i++) {
                const initData = data[i];
                const userData = JSON.parse(decodeURIComponent(initData.split('user=')[1].split('&')[0]));
                const firstName = userData.first_name;

                console.log(`========== Account ${i + 1} | ${firstName.green} ==========`);

                this.log(`Logging in...`, 'info');
                const loginResult = await this.login(initData);
                if (loginResult.success) {
                    this.log('Login successful!', 'success');
                    const token = loginResult.token;

                    const rewardResult = await this.getReward(token);
                    if (rewardResult.success) {
                        this.log(`Total Reward: ${rewardResult.data.total}`, 'success');
                        this.log(`Age: ${rewardResult.data.age}`, 'info');
                        this.log(`Premium: ${rewardResult.data.premium}`, 'info');
                        this.log(`Friends: ${rewardResult.data.friends}`, 'info');
                    } else {
                        this.log(`Unable to retrieve reward information: ${rewardResult.error}`, 'error');
                    }

                    const checkinStatus = await this.getCheckinStatus(token);
                    if (checkinStatus.success) {
                        this.log(`Current check-in day: ${checkinStatus.data.current_day}`, 'info');
                        this.log(`Consecutive check-in streak: ${checkinStatus.data.current_streak}`, 'info');
                        
                        if (checkinStatus.data.can_claim) {
                            this.log('Check-in available, performing check-in...', 'info');
                            const claimResult = await this.claimCheckin(token);
                            if (claimResult.success) {
                                this.log(`Check-in successful, streak: ${claimResult.data.current_streak} days`, 'success');
                            } else {
                                this.log(`Check-in failed: ${claimResult.error}`, 'error');
                            }
                        } else {
                            this.log('Already checked in today', 'warning');
                        }
                    } else {
                        this.log(`Unable to check check-in status: ${checkinStatus.error}`, 'error');
                    }
                    if (shouldDoMissions) {
                        this.log('Checking available missions...', 'info');
                        const missionsResult = await this.getPartnerMissions(token);
                        if (missionsResult.success) {
                            for (const mission of missionsResult.missions) {
                                const claimResult = await this.claimPartnerMission(token, mission.pm_id);
                                if (claimResult.success) {
                                    this.log(`Completed mission "${mission.title}" | Reward: ${mission.reward}`, 'success');
                                }
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            }
                        } else {
                            this.log(`Unable to retrieve mission list: ${missionsResult.error}`, 'error');
                        }
                    }
                } else {
                    this.log(`Login failed! ${loginResult.error}`, 'error');
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            await this.countdown(1440 * 60);
        }
    }
}

const client = new DuckClient();
client.main().catch(err => {
    client.log(err.message, 'error');
    process.exit(1);
});
