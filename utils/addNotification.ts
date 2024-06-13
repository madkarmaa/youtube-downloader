import fs from 'fs';
import inquirer from 'inquirer';
import path from 'path';
import { title } from 'process';
import getUuidByString from 'uuid-by-string';

const genUUID = (string: string) => {
    return getUuidByString(string + Date.now(), 5);
};

const notificationsFilePath = path.resolve('notifications.json');

console.clear();
inquirer
    .prompt([
        {
            name: 'title',
            message: 'Notification title:',
        },
        {
            name: 'body',
            message: 'Notification body:',
        },
    ])
    .then((answers) => {
        const newNotification = {
            title: answers.title,
            body: answers.body.replaceAll('\\n', '\n'),
            uuid: genUUID(title),
        };

        try {
            const data = fs.readFileSync(notificationsFilePath, 'utf8');
            let notifications: any[] = JSON.parse(data);

            notifications.push(newNotification);

            fs.writeFileSync(notificationsFilePath, JSON.stringify(notifications, null, 4));
            console.log('Notification added successfully!');
        } catch (err: any) {
            if (err.code === 'ENOENT') {
                const initialData = [newNotification];
                fs.writeFileSync(notificationsFilePath, JSON.stringify(initialData, null, 4));
                console.log('Notification added successfully! (New file created)');
            } else console.error('Error:', err);
        }
    })
    .catch((error) => {
        console.error(error);
    });
